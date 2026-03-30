import type { UpdateArticleCategoryInput, ListArticlesQuery } from './types.js';

interface ValidationSuccess<T> {
  ok: true;
  value: T;
}

interface ValidationFailure {
  ok: false;
  error: string;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? fallback), 10) || fallback;
  return Math.min(max, Math.max(1, parsed));
}

function parseOptionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseArticlesListQuery(query: Record<string, unknown>): ListArticlesQuery {
  const page = parsePositiveInt(query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePositiveInt(query.limit, 20, 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search: parseOptionalText(query.search),
    source: parseOptionalText(query.source),
    category: parseOptionalText(query.category),
  };
}

export function parseArticleId(value: unknown): ValidationResult<number> {
  const id = Number.parseInt(String(value ?? ''), 10);

  if (Number.isNaN(id) || id <= 0) {
    return { ok: false, error: 'Invalid id' };
  }

  return { ok: true, value: id };
}

export function parseUpdateArticleCategoryInput(
  idValue: unknown,
  body: unknown,
): ValidationResult<UpdateArticleCategoryInput> {
  const id = parseArticleId(idValue);

  if (!id.ok) {
    return id;
  }

  if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'category')) {
    return { ok: false, error: 'category is required' };
  }

  const categoryValue = (body as { category?: unknown }).category;

  if (categoryValue !== null && categoryValue !== undefined && typeof categoryValue !== 'string') {
    return { ok: false, error: 'category must be a string or null' };
  }

  const normalizedCategory = normalizeNullableText(categoryValue);

  if (normalizedCategory && normalizedCategory.length > 120) {
    return { ok: false, error: 'category is too long (max 120 chars)' };
  }

  return {
    ok: true,
    value: {
      id: id.value,
      category: normalizedCategory,
    },
  };
}
