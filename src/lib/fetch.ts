import { fetchWithPuppeteer } from './puppeteer.js';
import { isSafeUrl } from './validateUrl.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('fetch');

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetches HTML from a URL using native fetch with Puppeteer fallback.
 * Validates the URL against SSRF before making any request.
 */
export async function fetchHtml(
  url: string,
  usePuppeteerFallback = true,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  if (!isSafeUrl(url)) {
    log.warn({ url }, 'URL blocked by SSRF check');
    return '';
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, ...extraHeaders },
    });
    if (!res.ok) {
      log.warn({ url, status: res.status }, 'HTTP fetch failed');
      return usePuppeteerFallback ? fetchWithPuppeteer(url) : '';
    }
    return await res.text();
  } catch (err) {
    log.warn({ url, err }, 'fetch error, trying puppeteer fallback');
    return usePuppeteerFallback ? fetchWithPuppeteer(url) : '';
  }
}

/**
 * GET JSON (no Puppeteer fallback). Used for public JSON APIs.
 */
export async function fetchJson<T>(url: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  if (!isSafeUrl(url)) {
    log.warn({ url }, 'fetchJson: URL blocked by SSRF check');
    return { ok: false, status: 0, data: null };
  }
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      log.warn({ url, status: res.status }, 'fetchJson: HTTP error');
      return { ok: false, status: res.status, data: null };
    }
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch (err) {
    log.warn({ url, err }, 'fetchJson: request failed');
    return { ok: false, status: 0, data: null };
  }
}
