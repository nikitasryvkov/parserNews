import type { Knex } from 'knex';
import type { ArticleRecord, ArticleFilterOptions, ListArticlesQuery, ListArticlesResult } from './types.js';

interface DistinctRow {
  value: string | null;
}

interface CountRow {
  count: string | number;
}

export interface ArticlesRepository {
  list(query: ListArticlesQuery): Promise<ListArticlesResult>;
  updateCategory(id: number, category: string | null): Promise<ArticleRecord | null>;
  deleteById(id: number): Promise<number>;
  deleteAll(): Promise<number>;
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

function collectDistinctTextOptions(rows: DistinctRow[]): string[] {
  return [...new Set(
    rows
      .map((row) => row.value?.trim())
      .filter((value): value is string => Boolean(value)),
  )].sort((left, right) => left.localeCompare(right, 'ru-RU'));
}

async function fetchFilterOptions(db: Knex): Promise<ArticleFilterOptions> {
  const [sourceRows, categoryRows] = await Promise.all([
    db('news_articles')
      .distinct<DistinctRow[]>({ value: 'source' })
      .whereNotNull('source'),
    db('news_articles')
      .distinct<DistinctRow[]>({ value: 'category' })
      .whereNotNull('category'),
  ]);

  return {
    sources: collectDistinctTextOptions(sourceRows),
    categories: collectDistinctTextOptions(categoryRows),
  };
}

export function createArticlesRepository(db: Knex): ArticlesRepository {
  return {
    async list(query) {
      let base = db('news_articles');

      if (query.search) {
        const escapedSearch = escapeLike(query.search);
        base = base.where(function applySearch() {
          this.whereILike('title', `%${escapedSearch}%`)
            .orWhereILike('summary', `%${escapedSearch}%`)
            .orWhereILike('source', `%${escapedSearch}%`)
            .orWhereILike('category', `%${escapedSearch}%`);
        });
      }

      if (query.source) {
        base = base.whereILike('source', `%${escapeLike(query.source)}%`);
      }

      if (query.category) {
        base = base.whereILike('category', `%${escapeLike(query.category)}%`);
      }

      const [countRows, rows, filterOptions] = await Promise.all([
        base.clone().count<CountRow[]>('* as count'),
        base.clone()
          .select<ArticleRecord[]>('id', 'title', 'summary', 'source', 'source_url', 'category', 'published_at', 'created_at')
          .orderBy([{ column: 'published_at', order: 'desc', nulls: 'last' }, { column: 'id', order: 'desc' }])
          .limit(query.limit)
          .offset(query.offset),
        fetchFilterOptions(db),
      ]);

      const [countRow] = countRows;

      return {
        total: Number(countRow?.count ?? 0),
        page: query.page,
        limit: query.limit,
        articles: rows,
        filterOptions,
      };
    },

    async updateCategory(id, category) {
      const [article] = await db('news_articles')
        .where({ id })
        .update({ category })
        .returning<ArticleRecord[]>(['id', 'title', 'summary', 'source', 'source_url', 'category', 'published_at', 'created_at']);

      return article ?? null;
    },

    async deleteById(id) {
      return db('news_articles').where({ id }).delete();
    },

    async deleteAll() {
      return db('news_articles').delete();
    },
  };
}
