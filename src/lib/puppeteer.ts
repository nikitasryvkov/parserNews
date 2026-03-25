import puppeteer, { type Browser } from 'puppeteer';
import { isSafeUrl } from './validateUrl.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('puppeteer');

let _browser: Browser | null = null;
let _launching: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser;

  if (_launching) return _launching;

  _launching = puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    _browser = await _launching;
    _browser.on('disconnected', () => {
      _browser = null;
    });
    return _browser;
  } finally {
    _launching = null;
  }
}

export type PuppeteerFetchOptions = {
  /** Пауза после domcontentloaded (мс), чтобы догрузился клиентский рендер */
  settleMs?: number;
};

export async function fetchWithPuppeteer(url: string, options?: PuppeteerFetchOptions): Promise<string> {
  if (!isSafeUrl(url)) {
    log.warn({ url }, 'URL blocked by SSRF check in puppeteer');
    return '';
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    if (!response?.ok()) return '';
    const ms = options?.settleMs ?? 0;
    if (ms > 0) await new Promise((r) => setTimeout(r, Math.min(ms, 30_000)));
    return await page.content();
  } catch (err) {
    log.error({ url, err }, 'puppeteer fetch failed');
    return '';
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (_browser?.connected) {
    await _browser.close();
    _browser = null;
  }
}
