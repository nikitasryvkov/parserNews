/**
 * Типы данных для парсера новостей.
 */

/** Сырой вывод парсера (структура зависит от конкретного парсера) */
export type RawParserOutput = Record<string, unknown>;

/** Нормализованная статья из адаптера */
export interface AdapterArticle {
  title: string;
  summary?: string;
  content: string;
  sourceUrl: string;
  source: string;
  category?: string;
  publishedAt?: Date | string;
}

/** Задача на парсинг (API → parse queue) */
export interface ParseJobData {
  parserName: string;
  url: string;
  /** Каталог с загруженными .xlsx (парсер vpo) */
  uploadDir?: string;
}

/** Задача на адаптацию (parse → adapt queue) */
export interface AdaptJobData {
  rawFilePath: string;
  parserName: string;
  format: string;
}

/** Компания из рейтинга Smart Ranking */
export interface SmartRankingCompany {
  position: number;
  companyName: string;
  companyUrl: string;
  ceo?: string;
  segment?: string;
  revenue2024q2?: string;
  revenue2025q3?: string;
  dynamics?: string;
  source: string;
  sourceUrl: string;
  rawCompanyPage?: Record<string, unknown>;
}

/** Задача на сохранение (adapt → store queue) — discriminated union */
export type StoreJobData =
  | { type: 'articles'; parserName: string; items: AdapterArticle[] }
  | { type: 'companies_medtech'; parserName: string; items: SmartRankingCompany[] }
  | { type: 'companies_edtech'; parserName: string; items: SmartRankingCompany[] };
