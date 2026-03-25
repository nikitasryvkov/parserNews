/**
 * Свод ВПО: multiple .xlsx/.xls files with identical structure.
 * Sheets Р2_1_2(1)–(4): student distribution by course and direction.
 * Extracts rows matching target directions, preserves ALL original columns.
 */
import { readdir, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import type { ParserFn } from '../types.js';
import { registerParser } from '../registry.js';
import { createChildLogger } from '../../lib/logger.js';
import type { VpoSheetData, VpoFileResult, VpoParserOutput } from '../../types/vpo.js';
import { persistVpoHistory } from '../../services/vpoHistory.js';
import { VPO_TARGET_DIRECTIONS, VPO_SHEET_PATTERNS, HEADER_ROW_END, DATA_ROW_START } from './directions.js';

const log = createChildLogger('vpo');

async function cleanupDir(dir: string): Promise<void> {
  try {
    if (existsSync(dir)) await rm(dir, { recursive: true, force: true });
  } catch (err) {
    log.warn({ err, dir }, 'vpo: failed to remove upload dir');
  }
}

function normalizeDirection(cell: unknown): string {
  return String(cell ?? '')
    .replace(/^\s+/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Find actual sheet names in the workbook that match our target patterns.
 * Handles Cyrillic Р vs Latin P and optional spaces before parentheses.
 */
function findTargetSheets(wb: XLSX.WorkBook): string[] {
  const found: string[] = [];
  for (const actual of wb.SheetNames) {
    const normalized = actual
      .replace(/^Р/u, 'P')
      .replace(/^P/u, 'P')
      .replace(/\s+/g, '');

    for (const pattern of VPO_SHEET_PATTERNS) {
      const normPattern = pattern.replace(/\s+/g, '');
      if (normalized.endsWith(normPattern) || normalized.includes(normPattern)) {
        if (!found.includes(actual)) found.push(actual);
        break;
      }
    }
  }
  return found;
}

function processSheet(sheetName: string, aoa: unknown[][]): VpoSheetData {
  const headerRows = aoa.slice(0, HEADER_ROW_END).map((r) => [...(r as unknown[])]);
  const totalCols = Math.max(
    ...aoa.slice(0, Math.min(30, aoa.length)).map((r) => (r as unknown[])?.length || 0),
  );
  const dataRows: VpoSheetData['dataRows'] = [];

  for (let i = DATA_ROW_START; i < aoa.length; i++) {
    const row = aoa[i] as unknown[] | undefined;
    if (!row?.length) continue;
    const direction = normalizeDirection(row[0]);
    if (!direction || !VPO_TARGET_DIRECTIONS.has(direction)) continue;

    const cells = Array.from({ length: totalCols }, (_, c) => row[c] ?? '');
    dataRows.push({ excelRow: i + 1, cells });
  }

  return { sheetName, headerRows, dataRows, totalCols };
}

async function processWorkbook(filePath: string, fileName: string): Promise<VpoFileResult> {
  const buf = await readFile(filePath);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });
  const targetSheets = findTargetSheets(wb);

  if (targetSheets.length === 0) {
    log.warn({ fileName, available: wb.SheetNames }, 'No target sheets found');
  }

  const sheets: VpoSheetData[] = [];
  for (const actual of targetSheets) {
    const sh = wb.Sheets[actual];
    if (!sh) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '' });
    const data = processSheet(actual, aoa);
    if (data.dataRows.length > 0) {
      sheets.push(data);
    } else {
      log.warn({ fileName, sheetName: actual }, 'No matching directions found in sheet');
    }
  }

  return { fileName, sheets };
}

const vpoParser: ParserFn = async (_url, options) => {
  const uploadDir = options?.uploadDir;
  if (!uploadDir || !existsSync(uploadDir)) {
    log.error({ uploadDir }, 'vpo: uploadDir missing or not found');
    return [{ items: [] }];
  }

  const allNames = await readdir(uploadDir);
  const names = allNames.filter((n) => /\.(xlsx|xls)$/i.test(n));
  if (names.length === 0) {
    log.warn({ uploadDir }, 'vpo: no Excel files');
    await cleanupDir(uploadDir);
    return [{ items: [] }];
  }

  const files: VpoFileResult[] = [];
  for (const name of names) {
    const fp = join(uploadDir, name);
    const result = await processWorkbook(fp, name);
    files.push(result);
  }

  const totalRows = files.reduce(
    (sum, f) => sum + f.sheets.reduce((s, sh) => s + sh.dataRows.length, 0),
    0,
  );
  log.info({ files: names.length, totalRows }, 'vpo parse complete');

  const output: VpoParserOutput = { files };
  const historyId = await persistVpoHistory(output, names);
  if (!historyId) {
    const err = new Error(
      'Не удалось сохранить объединённый свод (история ВПО). Проверьте миграции БД (vpo_history), PostgreSQL и права на каталог data/vpo-history.',
    );
    log.error({ err }, 'vpo: persist history failed');
    throw err;
  }

  await cleanupDir(uploadDir);
  return [{ items: [], vpoFiles: files }];
};

registerParser('vpo', vpoParser);
