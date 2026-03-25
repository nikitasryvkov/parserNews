import { getDb } from '../db/index.js';
import { normalizeUrl } from '../lib/normalizeUrl.js';
import { createChildLogger } from '../lib/logger.js';
import type { AdapterArticle } from '../types/index.js';

const log = createChildLogger('newsArticles');

export interface InsertResult {
  total: number;
  inserted: number;
  skipped: number;
}

const BATCH_SIZE = 500;

export async function insertNewsArticles(articles: AdapterArticle[]): Promise<InsertResult> {
  const result: InsertResult = { total: articles.length, inserted: 0, skipped: 0 };
  if (articles.length === 0) return result;

  const rows = articles.map((a) => ({
    title: a.title,
    summary: a.summary ?? null,
    content: a.content,
    source_url: normalizeUrl(a.sourceUrl),
    source: a.source,
    category: a.category ?? null,
    published_at: a.publishedAt ?? null,
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    try {
      const dbResult = await getDb()('news_articles')
        .insert(batch)
        .onConflict('source_url')
        .ignore();

      const batchInserted = (dbResult as unknown as { rowCount?: number }).rowCount ?? batch.length;
      result.inserted += batchInserted;
      result.skipped += batch.length - batchInserted;
    } catch (err) {
      log.error(
        { err, batchIndex, batchSize: batch.length, processedSoFar: result.inserted },
        'Batch insert failed',
      );
      throw err;
    }
  }

  log.info(result, 'articles upsert complete');
  return result;
}
