const BASE = '/api';
const API_KEY_STORAGE_KEY = 'parserNews.apiKey';

function getStoredApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() || '';
}

function buildHeaders(extraHeaders = {}, includeJson = true) {
  const headers = new Headers();
  if (includeJson) headers.set('Content-Type', 'application/json');

  const apiKey = getStoredApiKey();
  if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`);

  Object.entries(extraHeaders).forEach(([key, value]) => {
    if (value !== undefined && value !== null) headers.set(key, value);
  });

  return headers;
}

async function readResponsePayload(res) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function authError(res, data) {
  const err = new Error(data.error || 'Требуется API key. Нажмите "API key" в боковой панели.');
  err.code = res.status === 403 ? 'AUTH_FORBIDDEN' : 'AUTH_REQUIRED';
  err.status = res.status;
  return err;
}

async function request(path, options = {}) {
  const headers = buildHeaders(options.headers, options.body === undefined || !(options.body instanceof FormData));
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  const data = await readResponsePayload(res);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw authError(res, data);
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export function getApiKey() {
  return getStoredApiKey();
}

export function hasApiKey() {
  return Boolean(getStoredApiKey());
}

export function setApiKey(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    return;
  }
  localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export async function fetchHealth() {
  const res = await fetch(`${BASE}/health`, {
    headers: buildHeaders({}, false),
  });
  return readResponsePayload(res);
}

export function fetchArticles(page = 1, limit = 20, search = '') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return request(`/articles?${params}`);
}

export function fetchCompanies(page = 1, limit = 20, search = '', pool = 'medtech') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  const path = pool === 'edtech' ? `/companies/edtech?${params}` : `/companies?${params}`;
  return request(path);
}

export function fetchQueues() {
  return request('/queues');
}

export function fetchFailedJobs() {
  return request('/queues/failed');
}

export function triggerParse(parserName) {
  return request(`/parse/${encodeURIComponent(parserName)}`, { method: 'POST' });
}

export function deleteAllArticles() {
  return request('/articles', { method: 'DELETE' });
}

export function deleteArticle(id) {
  return request(`/articles/${id}`, { method: 'DELETE' });
}

export function deleteAllCompanies(pool = 'medtech') {
  const path = pool === 'edtech' ? '/companies/edtech' : '/companies';
  return request(path, { method: 'DELETE' });
}

export function deleteCompany(id, pool = 'medtech') {
  const path = pool === 'edtech' ? `/companies/edtech/${id}` : `/companies/${id}`;
  return request(path, { method: 'DELETE' });
}

export function fetchTags() {
  return request('/tags');
}

export function addTag(tag, mode = 'phrase', exclude = false) {
  return request('/tags', { method: 'POST', body: JSON.stringify({ tag, mode, exclude }) });
}

export function updateTag(id, updates) {
  return request(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteTagById(id) {
  return request(`/tags/${id}`, { method: 'DELETE' });
}

export function deleteAllTags() {
  return request('/tags', { method: 'DELETE' });
}

export function resetTags() {
  return request('/tags/reset', { method: 'POST' });
}

export function fetchRiaSettings() {
  return request('/settings/ria');
}

export function patchRiaSettings(updates) {
  return request('/settings/ria', { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function uploadVpoSvod(fileList) {
  const fd = new FormData();
  for (let i = 0; i < fileList.length; i += 1) fd.append('files', fileList.item(i));
  const res = await fetch(`${BASE}/upload/vpo-svod`, {
    method: 'POST',
    body: fd,
    headers: buildHeaders({}, false),
  });
  const data = await readResponsePayload(res);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw authError(res, data);
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export function fetchVpoHistory() {
  return request('/vpo/history');
}

export async function downloadVpoHistoryFile(id) {
  const res = await fetch(`${BASE}/vpo/history/${encodeURIComponent(id)}/file`, {
    headers: buildHeaders({}, false),
  });
  if (!res.ok) {
    const data = await readResponsePayload(res);
    if (res.status === 401 || res.status === 403) throw authError(res, data);
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get('content-disposition') || '';
  const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return {
    blob,
    fileName: fileNameMatch?.[1] || `vpo-${id}.xlsx`,
  };
}

export function deleteVpoHistoryEntry(id) {
  return request(`/vpo/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function deleteAllVpoHistory() {
  return request('/vpo/history', { method: 'DELETE' });
}
