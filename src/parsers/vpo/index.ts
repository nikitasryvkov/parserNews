import { readdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ParserFn } from '../types.js';
import { registerParser } from '../registry.js';
import { createChildLogger } from '../../lib/logger.js';
import type { VpoFileResult, VpoParserOutput } from '../../types/vpo.js';
import { persistVpoHistory } from '../../services/vpoHistory.js';
import { parseVpoWorkbookInSandbox } from '../../services/vpoSandbox.js';

const log = createChildLogger('vpo');

async function cleanupDir(dir: string): Promise<void> {
  try {
    if (existsSync(dir)) await rm(dir, { recursive: true, force: true });
  } catch (err) {
    log.warn({ err, dir }, 'vpo: failed to remove upload dir');
  }
}

const vpoParser: ParserFn = async (_url, options) => {
  const uploadDir = options?.uploadDir;
  if (!uploadDir || !existsSync(uploadDir)) {
    log.error({ uploadDir }, 'vpo: uploadDir missing or not found');
    return [{ items: [] }];
  }

  try {
    const allNames = await readdir(uploadDir);
    const names = allNames.filter((name) => /\.xlsx$/i.test(name));
    if (names.length === 0) {
      log.warn({ uploadDir }, 'vpo: no .xlsx files');
      return [{ items: [] }];
    }

    const files: VpoFileResult[] = [];
    for (const name of names) {
      const fp = join(uploadDir, name);
      const result = await parseVpoWorkbookInSandbox(fp, name);
      files.push(result);
    }

    const totalRows = files.reduce(
      (sum, file) => sum + file.sheets.reduce((acc, sheet) => acc + sheet.dataRows.length, 0),
      0,
    );
    log.info({ files: names.length, totalRows }, 'vpo parse complete');

    const output: VpoParserOutput = { files };
    const historyId = await persistVpoHistory(output, names);
    if (!historyId) {
      const err = new Error(
        'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РѕР±СЉРµРґРёРЅС‘РЅРЅС‹Р№ СЃРІРѕРґ (РёСЃС‚РѕСЂРёСЏ Р’РџРћ). РџСЂРѕРІРµСЂСЊС‚Рµ РјРёРіСЂР°С†РёРё Р‘Р” (vpo_history), PostgreSQL Рё РїСЂР°РІР° РЅР° РєР°С‚Р°Р»РѕРі data/vpo-history.',
      );
      log.error({ err }, 'vpo: persist history failed');
      throw err;
    }

    return [{ items: [], vpoFiles: files }];
  } finally {
    await cleanupDir(uploadDir);
  }
};

registerParser('vpo', vpoParser);
