/**
 * Публичный API модуля parser-news для встройки в внешнюю систему.
 *
 * Типичный сценарий использования:
 *
 *   import { initConfig, createWorkers, startApi, addParseJob } from './module.js';
 *
 *   initConfig({ db: { host: 'mydb', password: 'secret' }, redis: { host: 'myredis' } });
 *   const workers = createWorkers();
 *   await startApi();
 *   await addParseJob({ parserName: 'tadviser', url: 'https://...' });
 */

export { initConfig, validateConfig } from './config/index.js';
export type { Config, ConfigInput } from './config/index.js';

export { createParseWorker, createAdaptWorker, createStoreWorker } from './workers/index.js';
export { addParseJob } from './queues/index.js';
export { startApi, createApp } from './api/index.js';
export { closeBrowser } from './lib/puppeteer.js';

export type {
  ParseJobData,
  AdaptJobData,
  StoreJobData,
  AdapterArticle,
  SmartRankingCompany,
  RawParserOutput,
} from './types/index.js';

export type { AdapterResult, AdapterFn } from './adapters/index.js';

import { createParseWorker, createAdaptWorker, createStoreWorker } from './workers/index.js';
import { closeBrowser } from './lib/puppeteer.js';

/**
 * Создаёт все три воркера и возвращает объект с методом close()
 * для корректного завершения работы.
 */
export function createWorkers() {
  const parseWorker = createParseWorker();
  const adaptWorker = createAdaptWorker();
  const storeWorker = createStoreWorker();

  return {
    parseWorker,
    adaptWorker,
    storeWorker,
    async close(): Promise<void> {
      await Promise.allSettled([parseWorker.close(), adaptWorker.close(), storeWorker.close()]);
      await closeBrowser();
    },
  };
}
