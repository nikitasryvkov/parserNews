import type { AdapterArticle, RawParserOutput, SmartRankingCompany } from '../types/index.js';

/** Результат адаптера — discriminated union по типу данных */
export type AdapterResult =
  | { type: 'articles'; items: AdapterArticle[] }
  | { type: 'companies'; items: SmartRankingCompany[] }
  | { type: 'none'; items: [] };

/** Сигнатура адаптера: (rawData, format) => AdapterResult */
export type AdapterFn = (rawData: RawParserOutput, format: string) => AdapterResult;
