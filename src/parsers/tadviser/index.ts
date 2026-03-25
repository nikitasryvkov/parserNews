import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { ParserFn } from '../types.js';
import { registerParser } from '../registry.js';
import { fetchHtml } from '../../lib/fetch.js';
import { fetchWithPuppeteer } from '../../lib/puppeteer.js';
import { createChildLogger } from '../../lib/logger.js';

const log = createChildLogger('tadviser');

const TADVISER_ANALYTICS_URL = 'https://www.tadviser.ru/index.php/Аналитика_TAdviser';

export interface TadviserItem {
  name: string;
  link: string;
  date: string;
  type: string;
  annotation: string;
}

function resolveType($block: Cheerio<AnyNode>, $: CheerioAPI): string {
  const titleEl = $block.find('.title').first();
  if (titleEl.length) return titleEl.text().trim();

  const prevH2 = $block.prevAll('h2').first();
  if (prevH2.length) {
    const headline = prevH2.find('.mw-headline');
    if (headline.length) return headline.text().trim();
  }

  const classes = $block.attr('class') || '';
  if (classes.includes('review') && classes.includes('rating')) return 'Обзор + Рейтинг';
  if (classes.includes('review')) return 'Обзор';
  if (classes.includes('rating')) return 'Рейтинг';
  if (classes.includes('reserch')) return 'Исследование';
  if (classes.includes('map')) return 'Карта';
  if (classes.includes('gid')) return 'Гид';
  if (classes.includes('infographic')) return 'Инфографика';
  return 'Статья';
}

function resolveTypeFromText(text: string): string {
  const t = text.toUpperCase();
  if (t.includes('ОБЗОР') && t.includes('РЕЙТИНГ')) return 'Обзор + Рейтинг';
  if (t.includes('ОБЗОР')) return 'Обзор';
  if (t.includes('РЕЙТИНГ')) return 'Рейтинг';
  if (t.includes('ИССЛЕДОВАНИЕ')) return 'Исследование';
  if (t.includes('КАРТА')) return 'Карта';
  if (t.includes('ГИД')) return 'Гид';
  if (t.includes('ИНФОГРАФИКА')) return 'Инфографика';
  return 'Статья';
}

function extractItemsAlt(html: string): TadviserItem[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: TadviserItem[] = [];
  const $content = ($('#mw-content-text').first().length ? $('#mw-content-text').first() : $.root()) as Cheerio<AnyNode>;

  $content.find('a[href*="tadviser.ru"]').each((_, aEl) => {
    const $a = $(aEl);
    const href = $a.attr('href') ?? '';
    const name = $a.text().trim();
    if (!href || !name || name.length < 8) return;
    if (href.startsWith('#') || href.includes('Аналитика_TAdviser') || href.includes('FormAnaliz')) return;
    if (!href.includes('/a/') && !href.includes('/index.php/') && !href.includes('/Статья:')) return;

    const link = href.startsWith('http') ? href : `https://www.tadviser.ru${href.startsWith('/') ? '' : '/'}${href}`;
    if (seen.has(link)) return;
    seen.add(link);

    const $block = $a.closest('p, div, li, td');
    const $prev = $block.prevAll('h2').first();
    const type = $prev.length ? resolveTypeFromText($prev.text()) : 'Статья';
    const blockText = $block.text().trim();
    const annotation = blockText.replace(name, '').trim().slice(0, 400) || '';

    items.push({ name, link, date: '', type, annotation });
  });

  return items;
}

function extractItems(html: string): TadviserItem[] {
  const $ = cheerio.load(html);
  const items: TadviserItem[] = [];

  $('.bigblock, .smallblock').each((_, el) => {
    const $block = $(el);
    const $info = $block.find('.info');
    const $link = $info.find('p a').first();
    if ($link.length === 0) return;

    const name = $link.text().trim();
    let link = $link.attr('href') || $block.find('.img a').attr('href') || '';
    if (link && !link.startsWith('http')) {
      link = link.startsWith('/') ? `https://www.tadviser.ru${link}` : `https://www.tadviser.ru/${link}`;
    }

    const dateEl = $info.find('.date').first();
    const date = dateEl.length ? dateEl.text().trim() : '';

    const annotationEl = $info.find('span').first();
    const annotation = annotationEl.length ? annotationEl.text().trim() : '';

    const type = resolveType($block, $);

    items.push({ name, link, date, type, annotation });
  });

  if (items.length === 0) return extractItemsAlt(html);
  return items;
}

const tadviserParser: ParserFn = async (url: string) => {
  const targetUrl = url || TADVISER_ANALYTICS_URL;
  let html = await fetchHtml(targetUrl);
  if (!html) html = await fetchWithPuppeteer(targetUrl);
  if (!html) return [{ items: [] }];

  const allItems = extractItems(html);
  if (allItems.length > 0) {
    log.info({ count: allItems.length }, 'TAdviser items parsed (all saved to raw)');
  }
  return [{ items: allItems }];
};

registerParser('tadviser', tadviserParser);
