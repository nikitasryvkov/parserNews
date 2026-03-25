import type { AdapterFn } from './types.js';
import type { RawParserOutput } from '../types/index.js';
import { registerAdapter } from './registry.js';
import { passesTagFilter } from './tagFilter.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('adapter:ria');

interface RiaItem {
  title: string;
  link: string;
  time: string;
  category: string;
  tags: string[];
}

function buildDateFromTime(timeStr: string): string | undefined {
  if (!timeStr || !timeStr.trim()) return undefined;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const now = new Date();
  const [, hours, minutes] = match;
  now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return now.toISOString();
}

const riaAdapter: AdapterFn = (rawData: RawParserOutput, _format: string) => {
  const allItems = (rawData.items as RiaItem[] | undefined) ?? [];
  const noFilter = process.env.RIA_NO_FILTER === '1';
  const items = noFilter
    ? allItems
    : allItems.filter((item) => {
        const combined = `${item.title} ${item.category} ${item.tags.join(' ')}`;
        return passesTagFilter(combined);
      });
  if (allItems.length > 0) {
    log.info({ total: allItems.length, filtered: items.length }, 'ria adapt');
  }
  return {
    type: 'articles',
    items: items.map((item) => ({
      title: item.title,
      summary: item.tags.length ? item.tags.join(', ') : undefined,
      content: item.title,
      sourceUrl: item.link,
      source: 'РИА Новости',
      category: item.category || undefined,
      publishedAt: buildDateFromTime(item.time) ?? undefined,
    })),
  };
};

registerAdapter('ria', riaAdapter);
