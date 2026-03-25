/**
 * Lightweight ReDoS detection: rejects patterns with nested quantifiers
 * that can cause catastrophic backtracking.
 *
 * Catches patterns like: (a+)+, (a*)*b, (a|b+)*, (\d+)+
 * Does NOT catch all ReDoS patterns — for full protection use the `re2` library.
 */
const NESTED_QUANTIFIER_RE =
  /(\([^)]*[+*][^)]*\))[+*?]|\(\?:[^)]*[+*][^)]*\)[+*?]/;

const MAX_REGEX_LENGTH = 500;

export function isSafeRegex(pattern: string): { safe: boolean; reason?: string } {
  if (pattern.length > MAX_REGEX_LENGTH) {
    return { safe: false, reason: `Pattern too long (max ${MAX_REGEX_LENGTH} chars)` };
  }

  try {
    new RegExp(pattern, 'i');
  } catch {
    return { safe: false, reason: 'Invalid regex syntax' };
  }

  if (NESTED_QUANTIFIER_RE.test(pattern)) {
    return { safe: false, reason: 'Nested quantifiers detected — potential ReDoS' };
  }

  return { safe: true };
}
