import type { ParserFn } from './types.js';

/** Реестр парсеров по имени */
export const parserRegistry: Record<string, ParserFn> = {};

export function getParser(name: string): ParserFn | undefined {
  return parserRegistry[name];
}

export function registerParser(name: string, fn: ParserFn): void {
  parserRegistry[name] = fn;
}
