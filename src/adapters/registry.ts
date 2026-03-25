import type { AdapterFn } from './types.js';

/** Реестр адаптеров по имени парсера */
export const adapterRegistry: Record<string, AdapterFn> = {};

export function getAdapter(parserName: string): AdapterFn | undefined {
  return adapterRegistry[parserName];
}

export function registerAdapter(parserName: string, fn: AdapterFn): void {
  adapterRegistry[parserName] = fn;
}
