import { existsSync } from 'fs';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join, resolve, relative, sep } from 'path';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { createChildLogger } from '../lib/logger.js';
import type { VpoParserOutput } from '../types/vpo.js';
import { vpoOutputToXlsxBuffer } from './vpoWorkbook.js';

const log = createChildLogger('vpoHistory');

export const VPO_HISTORY_DIR = join(process.cwd(), 'data', 'vpo-history');

export interface VpoHistoryRow {
  id: string;
  created_at: Date;
  source_files: string[];
  row_count: number;
  title: string;
  storage_file: string;
}

export async function persistVpoHistory(output: VpoParserOutput, sourceFileNames: string[]): Promise<string | null> {
  if (sourceFileNames.length === 0) return null;

  await mkdir(VPO_HISTORY_DIR, { recursive: true });
  const id = randomUUID();
  const storageFile = `${id}.xlsx`;
  const absPath = join(VPO_HISTORY_DIR, storageFile);

  const totalRows = output.files.reduce(
    (sum, f) => sum + f.sheets.reduce((s, sh) => s + sh.dataRows.length, 0),
    0,
  );

  try {
    const buf = vpoOutputToXlsxBuffer(output);
    await writeFile(absPath, buf);
  } catch (err) {
    log.error({ err }, 'Failed to write vpo history xlsx');
    return null;
  }

  const title = `Свод ВПО — ${new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })} — ${sourceFileNames.length} файл(ов), ${totalRows} строк`;

  try {
    await getDb()('vpo_history').insert({
      id,
      created_at: new Date(),
      source_files: JSON.stringify(sourceFileNames),
      row_count: totalRows,
      title,
      storage_file: storageFile,
    });
  } catch (err) {
    log.error({ err, id }, 'Failed to insert vpo_history row');
    return null;
  }

  log.info({ id, rows: totalRows, files: sourceFileNames.length }, 'VPO history saved');
  return id;
}

export async function listVpoHistory(limit = 50): Promise<VpoHistoryRow[]> {
  const rows = await getDb()('vpo_history')
    .select('id', 'created_at', 'source_files', 'row_count', 'title', 'storage_file')
    .orderBy('created_at', 'desc')
    .limit(limit);

  return rows.map((r) => ({
    id: r.id as string,
    created_at: r.created_at as Date,
    source_files: Array.isArray(r.source_files)
      ? (r.source_files as string[])
      : (JSON.parse(String(r.source_files ?? '[]')) as string[]),
    row_count: Number(r.row_count),
    title: String(r.title),
    storage_file: String(r.storage_file),
  }));
}

export async function deleteVpoHistoryEntry(id: string): Promise<boolean> {
  const row = await getDb()('vpo_history').where({ id }).first();
  if (!row) return false;

  const abs = resolveVpoHistoryFilePath(String(row.storage_file));
  if (abs) {
    try { await unlink(abs); } catch { /* file already gone */ }
  }

  await getDb()('vpo_history').where({ id }).delete();
  log.info({ id }, 'VPO history entry deleted');
  return true;
}

export async function deleteAllVpoHistory(): Promise<number> {
  const rows = await getDb()('vpo_history').select('storage_file');
  for (const row of rows) {
    const abs = resolveVpoHistoryFilePath(String(row.storage_file));
    if (abs) {
      try { await unlink(abs); } catch { /* file already gone */ }
    }
  }
  const { rowCount } = await getDb()('vpo_history').delete() as unknown as { rowCount: number };
  log.info({ deleted: rowCount }, 'All VPO history deleted');
  return rowCount ?? 0;
}

export function resolveVpoHistoryFilePath(storageFile: string): string | null {
  const base = storageFile.replace(/[/\\]/g, '');
  if (!base || !/^[0-9a-f-]+\.xlsx$/i.test(base)) return null;
  const root = resolve(VPO_HISTORY_DIR);
  const abs = resolve(join(root, base));
  const rel = relative(root, abs);
  if (!rel || rel.split(sep).includes('..')) return null;
  if (!existsSync(abs)) return null;
  return abs;
}
