import type { AdapterFn } from './types.js';
import type { RawParserOutput } from '../types/index.js';
import { registerAdapter } from './registry.js';
import { passesTagFilter } from './tagFilter.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('adapter:tadviser');

interface TadviserItem {
  name: string;
  link: string;
  date: string;
  type: string;
  annotation: string;
}

function parseTadviserDate(dateStr: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const months: Record<string, string> = {
    январь: '01', февраль: '02', март: '03', апрель: '04',
    май: '05', июнь: '06', июль: '07', август: '08',
    сентябрь: '09', октябрь: '10', ноябрь: '11', декабрь: '12',
  };
  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return dateStr;
  const monthKey = Object.keys(months).find((m) => parts[0].startsWith(m.substring(0, 3)));
  const year = parts[1]?.replace(/\D/g, '') || '';
  if (monthKey && year) return `${year}-${months[monthKey]}-01`;
  return dateStr;
}

const tadviserAdapter: AdapterFn = (rawData: RawParserOutput, _format: string) => {
  const allItems = (rawData.items as TadviserItem[] | undefined) ?? [];
  const noFilter = process.env.TADVISER_NO_FILTER === '1';
  const items = noFilter
    ? allItems
    : allItems.filter((item) => {
        const combined = `${item.name} ${item.annotation}`;
        return passesTagFilter(combined);
      });
  if (allItems.length > 0) {
    log.info({ total: allItems.length, filtered: items.length }, 'tadviser adapt');
  }
  return {
    type: 'articles',
    items: items.map((item) => ({
      title: item.name,
      summary: item.annotation || undefined,
      content: item.annotation || '',
      sourceUrl: item.link,
      source: 'TAdviser',
      category: item.type || undefined,
      publishedAt: parseTadviserDate(item.date) ?? undefined,
    })),
  };
};

registerAdapter('tadviser', tadviserAdapter);
