import * as cheerio from 'cheerio';
import type { ParserFn } from '../types.js';
import { registerParser } from '../registry.js';
import { fetchHtml } from '../../lib/fetch.js';
import { fetchWithPuppeteer } from '../../lib/puppeteer.js';
import { createChildLogger } from '../../lib/logger.js';
import { getRiaParserOptions } from '../../services/parserSettings.js';

const log = createChildLogger('ria');

const RIA_LENTA_URL = 'https://ria.ru/lenta/';

const RIA_FETCH_HEADERS: Record<string, string> = {
  'Accept-Language': 'ru-RU,ru;q=0.9',
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  Referer: RIA_LENTA_URL,
};

export interface RiaItem {
  title: string;
  link: string;
  time: string;
  category: string;
  tags: string[];
}

const ARTICLE_URL_RE = /^https?:\/\/ria\.ru\/\d{8}\/.+\.html$/;

/** РИА не отдаёт разные наборы по ?page=N для обычного fetch; следующая порция — только через /services/lenta/more.html */
function extractNextMorePath(html: string): string | null {
  const $ = cheerio.load(html);
  const fromChunk = $('.list-items-loaded[data-next-url]').first().attr('data-next-url');
  if (fromChunk) return fromChunk;
  const moreBtn = $('.list-more[data-url]')
    .toArray()
    .map((el) => $(el).attr('data-url'))
    .find((u) => u && u.includes('/services/lenta/more'));
  return moreBtn ?? null;
}

function resolveServiceUrl(pathOrUrl: string): string {
  const raw = pathOrUrl.trim().replace(/&amp;/g, '&');
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `https://ria.ru${path}`;
}

function extractItems(html: string): RiaItem[] {
  const $ = cheerio.load(html);
  const items: RiaItem[] = [];
  const seen = new Set<string>();

  $('.list-item').each((_, el) => {
    const $item = $(el);
    const $a = $item.find('.list-item__title a, .list-item__content a').first();
    const title = ($a.text() || $item.find('.list-item__title').text() || '').trim();
    const link = $a.attr('href') ?? '';
    if (!title || !link) return;

    const fullLink = link.startsWith('http') ? link : `https://ria.ru${link.startsWith('/') ? '' : '/'}${link}`;
    if (seen.has(fullLink)) return;
    seen.add(fullLink);

    const time = ($item.find('.list-item__date, .list-item__info-date').text() || '').trim();
    const category = ($item.find('.list-item__category, .list-item__info-category').text() || '').trim();
    const tags: string[] = [];
    $item.find('.list-item__tags a, .list-item__tag').each((__, tagEl) => {
      const t = $(tagEl).text().trim();
      if (t) tags.push(t);
    });

    items.push({ title, link: fullLink, time, category, tags });
  });

  if (items.length > 0) return items;

  $('a[href]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') ?? '';
    const fullHref = href.startsWith('http') ? href : (href.startsWith('/') ? `https://ria.ru${href}` : '');
    if (!fullHref || !ARTICLE_URL_RE.test(fullHref)) return;
    if (seen.has(fullHref)) return;

    const title = $a.text().trim();
    if (!title || title.length < 10) return;
    seen.add(fullHref);

    const $parent = $a.closest('div, li, article');
    const tags: string[] = [];
    $parent.find('a').each((__, tagEl) => {
      const tagHref = $(tagEl).attr('href') ?? '';
      const tagText = $(tagEl).text().trim();
      if (tagText && tagText !== title && !ARTICLE_URL_RE.test(tagHref.startsWith('http') ? tagHref : `https://ria.ru${tagHref}`)) {
        tags.push(tagText);
      }
    });

    items.push({ title, link: fullHref, time: '', category: tags[0] || '', tags });
  });

  return items;
}

async function fetchHtmlChunk(url: string, settleMs: number): Promise<string> {
  let html = await fetchHtml(url, false, { ...RIA_FETCH_HEADERS, Referer: RIA_LENTA_URL });
  if (!html) {
    log.info({ url }, 'RIA chunk: fetch empty, Puppeteer');
    html = await fetchWithPuppeteer(url, { settleMs });
  }
  return html;
}

const riaParser: ParserFn = async (url: string) => {
  const baseUrl = url || RIA_LENTA_URL;
  const { lentaPages: maxBatches, pageDelayMs: pauseMs, puppeteerSettleMs: settleMs } = await getRiaParserOptions();
  log.info({ baseUrl, maxBatches, pauseMs, settleMs }, 'Fetching RIA Novosti (lenta + more.html)');

  const byLink = new Map<string, RiaItem>();

  let html = await fetchHtmlChunk(baseUrl, settleMs);
  if (!html) {
    log.warn('RIA lenta: empty response');
    return [{ items: [] }];
  }

  let nextMore = extractNextMorePath(html);

  for (let b = 1; b <= maxBatches; b++) {
    const batchItems = extractItems(html);
    for (const item of batchItems) {
      if (!byLink.has(item.link)) byLink.set(item.link, item);
    }
    log.info({ batch: b, batchSize: batchItems.length, uniqueTotal: byLink.size, hasMore: !!nextMore }, 'RIA batch');

    if (b >= maxBatches) break;
    if (!nextMore) break;

    if (pauseMs > 0) await new Promise((r) => setTimeout(r, pauseMs));

    const moreUrl = resolveServiceUrl(nextMore);
    html = await fetchHtmlChunk(moreUrl, settleMs);
    if (!html) {
      log.warn({ moreUrl }, 'RIA more.html: empty, stop');
      break;
    }
    nextMore = extractNextMorePath(html);
  }

  const items = [...byLink.values()];
  log.info({ count: items.length, batchesRequested: maxBatches }, 'RIA items parsed');
  return [{ items }];
};

registerParser('ria', riaParser);
