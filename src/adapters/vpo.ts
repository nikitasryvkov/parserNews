import type { RawParserOutput } from '../types/index.js';
import type { AdapterFn } from './types.js';
import { registerAdapter } from './registry.js';

/** Свод ВПО: данные только в объединённом .xlsx и vpo_history, не в news_articles. */
const vpoAdapter: AdapterFn = (_rawData: RawParserOutput, _format) => ({ type: 'none', items: [] });

registerAdapter('vpo', vpoAdapter);
