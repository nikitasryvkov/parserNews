import type { RawParserOutput } from '../types/index.js';

export interface ParserOptions {
  /** Абсолютный путь к каталогу с файлами (vpo) */
  uploadDir?: string;
}

/** Сигнатура парсера */
export type ParserFn = (url: string, options?: ParserOptions) => Promise<RawParserOutput[]>;
