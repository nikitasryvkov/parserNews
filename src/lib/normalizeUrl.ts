/** Normalizes a URL for deduplication: trims, strips trailing slash, decodes. */
export function normalizeUrl(url: string): string {
  try {
    let u = url.trim();
    if (u.endsWith('/')) u = u.slice(0, -1);
    try {
      u = decodeURIComponent(u);
    } catch {
      /* keep as-is if malformed */
    }
    return u;
  } catch {
    return url;
  }
}
