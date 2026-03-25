import { getDb } from '../db/index.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('edtechsIds');
const KEY = 'edtechs_company_ids';

export async function getSavedEdtechsCompanyIds(): Promise<number[]> {
  try {
    const row = await getDb()('app_settings').where({ key: KEY }).first();
    const val = row && typeof row === 'object' && 'value' in row ? String((row as { value: string }).value) : '';
    if (!val) return [];
    const parsed = JSON.parse(val) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0);
  } catch (err) {
    log.warn({ err }, 'Failed to read saved edtechs ids');
    return [];
  }
}

export async function saveEdtechsCompanyIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const value = JSON.stringify(ids);
  const now = new Date();
  await getDb()('app_settings')
    .insert({ key: KEY, value, updated_at: now })
    .onConflict('key')
    .merge({ value, updated_at: now });
  log.info({ count: ids.length }, 'Saved edtechs company id snapshot');
}
