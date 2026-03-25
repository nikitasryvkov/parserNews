import { getDb } from '../db/index.js';
import { TADVISER_TAGS } from '../parsers/tadviser/tags.js';
import { createChildLogger } from '../lib/logger.js';
import { isSafeRegex } from '../lib/safeRegex.js';

const log = createChildLogger('tags');

export type TagMode = 'phrase' | 'words' | 'prefix' | 'regex';

export interface TagRow {
  id: number;
  tag: string;
  mode: TagMode;
  exclude: boolean;
  created_at: string;
}

export interface CachedTag {
  tag: string;
  mode: TagMode;
  exclude: boolean;
}

let _cache: CachedTag[] | null = null;

export async function loadTags(): Promise<CachedTag[]> {
  try {
    const rows: TagRow[] = await getDb()('tadviser_tags').select('tag', 'mode', 'exclude');
    _cache = rows.map((r) => ({ tag: r.tag, mode: r.mode, exclude: r.exclude }));
    return _cache;
  } catch {
    log.warn('Could not load tags from DB, using hardcoded defaults');
    _cache = TADVISER_TAGS.map((t) => ({ tag: t, mode: 'phrase' as TagMode, exclude: false }));
    return _cache;
  }
}

export function getTagsSync(): CachedTag[] {
  return _cache ?? TADVISER_TAGS.map((t) => ({ tag: t, mode: 'phrase' as TagMode, exclude: false }));
}

export async function getAllTags(): Promise<TagRow[]> {
  return getDb()('tadviser_tags').select('*').orderBy('exclude', 'asc').orderBy('tag', 'asc');
}

export async function addTag(tag: string, mode: TagMode = 'phrase', exclude = false): Promise<TagRow> {
  const trimmed = tag.trim();
  if (!trimmed) throw new Error('Tag cannot be empty');

  if (mode === 'regex') {
    const check = isSafeRegex(trimmed);
    if (!check.safe) throw new Error(`Invalid regex: ${check.reason}`);
  }

  const [row] = await getDb()('tadviser_tags')
    .insert({ tag: trimmed, mode, exclude })
    .onConflict('tag')
    .merge({ mode, exclude })
    .returning('*');

  await loadTags();
  return row;
}

export async function updateTag(id: number, updates: { tag?: string; mode?: TagMode; exclude?: boolean }): Promise<TagRow | null> {
  if (updates.tag !== undefined) {
    updates.tag = updates.tag.trim();
    if (!updates.tag) throw new Error('Tag cannot be empty');
  }
  if (updates.mode === 'regex' && updates.tag) {
    const check = isSafeRegex(updates.tag);
    if (!check.safe) throw new Error(`Invalid regex: ${check.reason}`);
  }

  const [row] = await getDb()('tadviser_tags')
    .where({ id })
    .update(updates)
    .returning('*');

  if (row) await loadTags();
  return row ?? null;
}

export async function addManyTags(tags: string[], mode: TagMode = 'phrase'): Promise<number> {
  const trimmed = tags.map((t) => t.trim()).filter(Boolean);
  if (trimmed.length === 0) return 0;
  const rows = trimmed.map((tag) => ({ tag, mode, exclude: false }));
  await getDb()('tadviser_tags').insert(rows).onConflict('tag').ignore();
  await loadTags();
  return trimmed.length;
}

export async function deleteTag(id: number): Promise<boolean> {
  const deleted = await getDb()('tadviser_tags').where({ id }).delete();
  if (deleted) await loadTags();
  return deleted > 0;
}

export async function deleteAllTags(): Promise<number> {
  const { rowCount } = await getDb()('tadviser_tags').delete() as unknown as { rowCount: number };
  _cache = [];
  return rowCount ?? 0;
}

export async function resetToDefaults(): Promise<number> {
  await getDb()('tadviser_tags').delete();
  const rows = TADVISER_TAGS.map((tag) => ({ tag, mode: 'phrase' as TagMode, exclude: false }));
  await getDb()('tadviser_tags').insert(rows).onConflict('tag').ignore();
  await loadTags();
  return TADVISER_TAGS.length;
}
