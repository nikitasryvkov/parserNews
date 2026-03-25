/**
 * Smart Ranking MEDtech parser.
 * Collects data from the ranking page and individual company pages.
 */
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import type { ParserFn } from '../types.js';
import { registerParser } from '../registry.js';
import { fetchHtml } from '../../lib/fetch.js';
import { fetchWithPuppeteer } from '../../lib/puppeteer.js';
import { createChildLogger } from '../../lib/logger.js';

const log = createChildLogger('smartranking');

const MEDTECH_URL = 'https://smartranking.ru/ru/ranking/medicinskie-tehnologii/';
const BASE_URL = 'https://smartranking.ru';
const COMPANY_CONCURRENCY = 4;
const COMPANY_DELAY_MS = 200;

export interface SmartRankingCompanyRaw {
  position: number;
  companyName: string;
  companyUrl: string;
  ceo: string;
  segment: string;
  revenue2024q2: string;
  revenue2025q3: string;
  dynamics: string;
  companyPageData?: Record<string, unknown>;
}

async function fetchCompanyPage(path: string): Promise<Record<string, unknown> | undefined> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  try {
    const html = await fetchHtml(url, false);
    if (!html) return undefined;
    const $ = cheerio.load(html);
    const $content = $('.ranking-detail, .company-detail, main, .container').first();
    return {
      url,
      text: $content.text().trim().slice(0, 2000),
      scrapedAt: new Date().toISOString(),
    };
  } catch {
    return undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractCompanies(html: string): SmartRankingCompanyRaw[] {
  const $ = cheerio.load(html);
  const companies: SmartRankingCompanyRaw[] = [];

  $('#marketTable tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const tds = $tr.find('td');
    if (tds.length < 7) return;

    const position = parseInt($(tds[0]).text().trim(), 10) || 0;
    const $link = $(tds[1]).find('a.rank-company-link');
    const companyName = $link.find('.rank-company-name').text().trim();
    const href = $link.attr('href') || '';
    const companyUrl = href ? `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}` : '';

    const ceo = $(tds[2]).text().trim().replace(/^-$/, '') || '';
    const segment = $(tds[3]).text().trim() || '';

    const rev2024 = $(tds[4]).find('.rank-proceed-num').text().replace(/\s/g, '').trim();
    const rev2025 = $(tds[5]).find('.rank-proceed-num').text().replace(/\s/g, '').trim();
    const dynamicsEl = $(tds[6]).find('.rank-proceed-profit');
    const dynamics = dynamicsEl.text().trim() || '';

    companies.push({
      position,
      companyName,
      companyUrl,
      ceo,
      segment,
      revenue2024q2: rev2024,
      revenue2025q3: rev2025,
      dynamics,
    });
  });

  return companies;
}

const smartrankingParser: ParserFn = async (url: string) => {
  const targetUrl = url || MEDTECH_URL;
  let html = await fetchHtml(targetUrl);
  if (!html) html = await fetchWithPuppeteer(targetUrl);
  if (!html) return [{ items: [] }];

  const companies = extractCompanies(html);
  const fetchNested = process.env.SMARTRANKING_FETCH_COMPANIES !== '0';

  if (fetchNested && companies.length > 0) {
    log.info({ count: companies.length }, 'Fetching company pages in parallel');
    const limit = pLimit(COMPANY_CONCURRENCY);

    const tasks = companies.map((c, i) =>
      limit(async () => {
        if (!c.companyUrl) return c;
        const path = c.companyUrl.replace(BASE_URL, '');
        const pageData = await fetchCompanyPage(path);
        if (i > 0) await sleep(COMPANY_DELAY_MS);
        return pageData ? { ...c, companyPageData: pageData } : c;
      }),
    );

    const results = await Promise.all(tasks);
    log.info({ count: results.length }, 'Company pages fetched');
    return [{ items: results }];
  }

  log.info({ count: companies.length }, 'Companies parsed');
  return [{ items: companies }];
};

registerParser('smartranking', smartrankingParser);
