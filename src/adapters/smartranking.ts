import type { RawParserOutput, SmartRankingCompany } from '../types/index.js';
import type { AdapterFn } from './types.js';
import { registerAdapter } from './registry.js';

interface SmartRankingCompanyRaw {
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

const RANKING_URL = 'https://smartranking.ru/ru/ranking/medicinskie-tehnologii/';

function adaptSmartRanking(rawData: RawParserOutput): SmartRankingCompany[] {
  const items = (rawData.items as SmartRankingCompanyRaw[] | undefined) ?? [];
  return items.map((item) => ({
    position: item.position,
    companyName: item.companyName,
    companyUrl: item.companyUrl,
    ceo: item.ceo || undefined,
    segment: item.segment || undefined,
    revenue2024q2: item.revenue2024q2 || undefined,
    revenue2025q3: item.revenue2025q3 || undefined,
    dynamics: item.dynamics || undefined,
    source: 'Smart Ranking',
    sourceUrl: RANKING_URL,
    rawCompanyPage: item.companyPageData,
  }));
}

const smartrankingAdapter: AdapterFn = (rawData, _format) => ({
  type: 'companies',
  items: adaptSmartRanking(rawData),
});

registerAdapter('smartranking', smartrankingAdapter);
