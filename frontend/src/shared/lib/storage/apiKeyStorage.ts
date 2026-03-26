const API_KEY_STORAGE_KEY = 'parserNews.apiKey';

export function getApiKey(): string {
  return window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() || '';
}

export function hasApiKey(): boolean {
  return Boolean(getApiKey());
}

export function setApiKey(value: string): void {
  const trimmed = value.trim();

  if (!trimmed) {
    clearApiKey();
    return;
  }

  window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
}

export function clearApiKey(): void {
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
}
