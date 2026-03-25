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

const RIA_SOURCE_TZ_OFFSET = '+03:00';

function buildPublishedAt(item: RiaItem): string | undefined {
  const dateMatch = item.link.match(/ria\.ru\/(\d{4})(\d{2})(\d{2})\//);
  if (!dateMatch) return undefined;

  const [, year, month, day] = dateMatch;
  const timeMatch = item.time.match(/(\d{1,2}):(\d{2})/);
  const hours = (timeMatch?.[1] ?? '00').padStart(2, '0');
  const minutes = timeMatch?.[2] ?? '00';
  const parsed = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00${RIA_SOURCE_TZ_OFFSET}`);

  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
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
      publishedAt: buildPublishedAt(item),
    })),
  };
};

registerAdapter('ria', riaAdapter);
