const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function fetchHealth() {
  return fetch(`${BASE}/health`).then((r) => r.json());
}

export function fetchArticles(page = 1, limit = 20, search = '') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return request(`/articles?${params}`);
}

/** @param {'medtech'|'edtech'} pool */
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

/** @param {'medtech'|'edtech'} pool */
export function deleteAllCompanies(pool = 'medtech') {
  const path = pool === 'edtech' ? '/companies/edtech' : '/companies';
  return request(path, { method: 'DELETE' });
}

/** @param {'medtech'|'edtech'} pool */
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
  const res = await fetch(`${BASE}/upload/vpo-svod`, { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function fetchVpoHistory() {
  return request('/vpo/history');
}

export function vpoHistoryDownloadUrl(id) {
  return `${BASE}/vpo/history/${encodeURIComponent(id)}/file`;
}

export function deleteVpoHistoryEntry(id) {
  return request(`/vpo/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function deleteAllVpoHistory() {
  return request('/vpo/history', { method: 'DELETE' });
}
