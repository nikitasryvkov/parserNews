import { getDb } from '../db/index.js';
import { normalizeUrl } from '../lib/normalizeUrl.js';
import { createChildLogger } from '../lib/logger.js';
import type { SmartRankingCompany } from '../types/index.js';

const log = createChildLogger('smartRankingCompanies');

export interface UpsertResult {
  total: number;
  processed: number;
}

const UPDATABLE_COLUMNS = [
  'position',
  'company_name',
  'ceo',
  'segment',
  'revenue_2024_q2',
  'revenue_2025_q3',
  'dynamics',
  'source',
  'source_url',
  'raw_company_page',
  'updated_at',
] as const;

const BATCH_SIZE = 500;

export async function insertSmartRankingCompanies(
  companies: SmartRankingCompany[],
): Promise<UpsertResult> {
  const result: UpsertResult = { total: companies.length, processed: 0 };
  if (companies.length === 0) return result;

  const knex = getDb();
  const now = new Date();

  const rows = companies.map((c) => ({
    position: c.position,
    company_name: c.companyName,
    company_url: normalizeUrl(c.companyUrl),
    ceo: c.ceo ?? null,
    segment: c.segment ?? null,
    revenue_2024_q2: c.revenue2024q2 ?? null,
    revenue_2025_q3: c.revenue2025q3 ?? null,
    dynamics: c.dynamics ?? null,
    source: c.source,
    source_url: c.sourceUrl,
    raw_company_page: c.rawCompanyPage ? JSON.stringify(c.rawCompanyPage) : null,
    updated_at: now,
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    try {
      await knex('smart_ranking_companies')
        .insert(batch)
        .onConflict('company_url')
        .merge(UPDATABLE_COLUMNS);

      result.processed += batch.length;
    } catch (err) {
      log.error(
        { err, batchIndex, batchSize: batch.length, processedSoFar: result.processed },
        'Batch upsert failed',
      );
      throw err;
    }
  }

  log.info(result, 'SmartRanking companies upserted');
  return result;
}
