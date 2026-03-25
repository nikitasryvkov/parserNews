import { getTagsSync, type CachedTag } from '../services/tags.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const _prefixCache = new WeakMap<CachedTag, RegExp[]>();
const _regexCache = new WeakMap<CachedTag, RegExp | null>();

function getPrefixRegexes(tag: CachedTag): RegExp[] {
  let cached = _prefixCache.get(tag);
  if (cached) return cached;

  const prefixes = tag.tag.toLowerCase().split(/\s+/).filter(Boolean);
  cached = prefixes.map(
    (p) => new RegExp(`(?:^|[\\s,.;:!?()\\[\\]«»"'—–-])${escapeRegex(p)}`, 'i'),
  );
  _prefixCache.set(tag, cached);
  return cached;
}

function getUserRegex(tag: CachedTag): RegExp | null {
  let cached = _regexCache.get(tag);
  if (cached !== undefined) return cached;

  try {
    cached = new RegExp(tag.tag, 'i');
  } catch {
    cached = null;
  }
  _regexCache.set(tag, cached);
  return cached;
}

export function tagMatches(text: string, tag: CachedTag): boolean {
  const lower = text.toLowerCase();
  const tagLower = tag.tag.toLowerCase();

  switch (tag.mode) {
    case 'phrase':
      return lower.includes(tagLower);

    case 'words': {
      const words = tagLower.split(/\s+/).filter(Boolean);
      return words.every((w) => lower.includes(w));
    }

    case 'prefix':
      return getPrefixRegexes(tag).every((re) => re.test(text));

    case 'regex': {
      const re = getUserRegex(tag);
      if (!re) return false;
      return re.test(text);
    }

    default:
      return lower.includes(tagLower);
  }
}

/**
 * Returns true if the text passes the tag filter:
 * 1. If ANY exclude-tag matches -> reject
 * 2. If no include-tags exist -> accept (nothing to filter by)
 * 3. If ANY include-tag matches -> accept
 * 4. Otherwise -> reject
 */
export function passesTagFilter(text: string): boolean {
  if (!text || !text.trim()) return false;

  const allTags = getTagsSync();
  const includeTags = allTags.filter((t) => !t.exclude);
  const excludeTags = allTags.filter((t) => t.exclude);

  if (excludeTags.some((t) => tagMatches(text, t))) return false;
  if (includeTags.length === 0) return true;
  return includeTags.some((t) => tagMatches(text, t));
}
