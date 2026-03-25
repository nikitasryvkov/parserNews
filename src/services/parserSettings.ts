import { getDb } from '../db/index.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('parserSettings');

const TABLE = 'app_settings';

export const RIA_SETTING_KEYS = {
  LENTA_PAGES: 'ria_lenta_pages',
  PAGE_DELAY_MS: 'ria_page_delay_ms',
  PUPPETEER_SETTLE_MS: 'ria_puppeteer_settle_ms',
} as const;

const ALL_RIA_KEYS = Object.values(RIA_SETTING_KEYS);

export interface RiaParserOptions {
  lentaPages: number;
  pageDelayMs: number;
  puppeteerSettleMs: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseNum(raw: string | undefined, fallback: number): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isNaN(n) ? fallback : n;
}

async function loadMap(): Promise<Record<string, string>> {
  const rows = await getDb()(TABLE).whereIn('key', ALL_RIA_KEYS).select('key', 'value');
  return Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]));
}

function fromEnv(): RiaParserOptions {
  return {
    lentaPages: clamp(parseNum(process.env.RIA_LENTA_PAGES, 5), 1, 50),
    pageDelayMs: clamp(parseNum(process.env.RIA_PAGE_DELAY_MS, 350), 0, 10_000),
    puppeteerSettleMs: clamp(parseNum(process.env.RIA_PUPPETEER_SETTLE_MS, 2000), 0, 30_000),
  };
}

/**
 * Порций ленты РИА: первая — /lenta/, далее цепочка /services/lenta/more.html (~20 новостей на порцию).
 * Значения: из БД, если ключ задан, иначе env, иначе дефолты.
 */
export async function getRiaParserOptions(): Promise<RiaParserOptions> {
  try {
    const map = await loadMap();
    const env = fromEnv();
    return {
      lentaPages: map[RIA_SETTING_KEYS.LENTA_PAGES] !== undefined
        ? clamp(parseNum(map[RIA_SETTING_KEYS.LENTA_PAGES], env.lentaPages), 1, 50)
        : env.lentaPages,
      pageDelayMs: map[RIA_SETTING_KEYS.PAGE_DELAY_MS] !== undefined
        ? clamp(parseNum(map[RIA_SETTING_KEYS.PAGE_DELAY_MS], env.pageDelayMs), 0, 10_000)
        : env.pageDelayMs,
      puppeteerSettleMs: map[RIA_SETTING_KEYS.PUPPETEER_SETTLE_MS] !== undefined
        ? clamp(parseNum(map[RIA_SETTING_KEYS.PUPPETEER_SETTLE_MS], env.puppeteerSettleMs), 0, 30_000)
        : env.puppeteerSettleMs,
    };
  } catch (err) {
    log.warn({ err }, 'Ria parser settings: DB unavailable, using env defaults');
    return fromEnv();
  }
}

export interface RiaParserOptionsInput {
  lentaPages?: number;
  pageDelayMs?: number;
  puppeteerSettleMs?: number;
}

export async function updateRiaParserOptions(input: RiaParserOptionsInput): Promise<RiaParserOptions> {
  const rows: { key: string; value: string }[] = [];
  if (input.lentaPages !== undefined) {
    rows.push({ key: RIA_SETTING_KEYS.LENTA_PAGES, value: String(clamp(Math.floor(input.lentaPages), 1, 50)) });
  }
  if (input.pageDelayMs !== undefined) {
    rows.push({ key: RIA_SETTING_KEYS.PAGE_DELAY_MS, value: String(clamp(Math.floor(input.pageDelayMs), 0, 10_000)) });
  }
  if (input.puppeteerSettleMs !== undefined) {
    rows.push({
      key: RIA_SETTING_KEYS.PUPPETEER_SETTLE_MS,
      value: String(clamp(Math.floor(input.puppeteerSettleMs), 0, 30_000)),
    });
  }

  for (const row of rows) {
    await getDb()(TABLE)
      .insert({ ...row, updated_at: new Date() })
      .onConflict('key')
      .merge({ value: row.value, updated_at: new Date() });
  }

  return getRiaParserOptions();
}
