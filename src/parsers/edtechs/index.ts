/**
 * ED Techs (edtechs.ru) — рейтинг edtech-компаний.
 * Список id: GET /api/edtech/ (полный перечень без перебора).
 * Карточка: GET /api/edtech_company_details/{id}
 */
import pLimit from 'p-limit';
import type { ParserFn } from '../types.js';
import { registerParser } from '../registry.js';
import { fetchJson } from '../../lib/fetch.js';
import { createChildLogger } from '../../lib/logger.js';
import { getSavedEdtechsCompanyIds, saveEdtechsCompanyIds } from '../../services/edtechsIds.js';

const log = createChildLogger('edtechs');

const BASE = 'https://edtechs.ru';
const LIST_URL = `${BASE}/api/edtech/`;
const DETAIL_URL = (id: number) => `${BASE}/api/edtech_company_details/${id}`;

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_DELAY_MS = 150;

interface EdtechListRow {
  id: number;
  name?: string;
  direction_names?: string;
  audience_names?: string;
  owners?: string;
  founders?: string;
  proceed_from?: number;
  proceed_until?: number;
  proceed_is_rating?: boolean;
  [key: string]: unknown;
}

interface EdtechListResponse {
  period?: string;
  data?: EdtechListRow[];
  error?: string;
}

export interface EdtechsCompanyRaw {
  position: number;
  edtechId: number;
  period?: string;
  listRow?: EdtechListRow;
  details: Record<string, unknown> | null;
  detailError?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseConcurrency(): number {
  const n = parseInt(process.env.EDTECHS_FETCH_CONCURRENCY ?? '', 10);
  if (Number.isFinite(n) && n >= 1 && n <= 16) return n;
  return DEFAULT_CONCURRENCY;
}

function parseDelayMs(): number {
  const n = parseInt(process.env.EDTECHS_REQUEST_DELAY_MS ?? '', 10);
  if (Number.isFinite(n) && n >= 0 && n <= 5000) return n;
  return DEFAULT_DELAY_MS;
}

async function fetchList(): Promise<{ period?: string; rows: EdtechListRow[] } | null> {
  const { ok, data } = await fetchJson<EdtechListResponse>(LIST_URL);
  if (!ok || !data) return null;
  if (data.error) {
    log.warn({ error: data.error }, 'edtech list API returned error field');
    return null;
  }
  const rows = Array.isArray(data.data) ? data.data : [];
  return { period: data.period, rows };
}

async function fetchDetail(id: number): Promise<{ json: Record<string, unknown> | null; err?: string }> {
  const url = DETAIL_URL(id);
  const { ok, status, data } = await fetchJson<Record<string, unknown>>(url);
  if (!ok || data === null) {
    return { json: null, err: `HTTP ${status || 'fail'}` };
  }
  if (typeof (data as { error?: string }).error === 'string') {
    return { json: null, err: (data as { error: string }).error };
  }
  return { json: data };
}

const edtechsParser: ParserFn = async (_url: string) => {
  const list = await fetchList();
  let orderedRows: EdtechListRow[] = [];
  let period: string | undefined;

  if (list && list.rows.length > 0) {
    orderedRows = list.rows.filter((r) => typeof r.id === 'number' && r.id > 0);
    period = list.period;
    const ids = orderedRows.map((r) => r.id);
    await saveEdtechsCompanyIds(ids);
    log.info({ count: ids.length, period }, 'Edtechs list loaded, id snapshot saved');
  } else {
    const fallback = await getSavedEdtechsCompanyIds();
    if (fallback.length === 0) {
      log.error('Edtechs list API failed and no saved ids in DB');
      return [{ items: [] as EdtechsCompanyRaw[] }];
    }
    orderedRows = fallback.map((id) => ({ id }));
    log.warn({ count: fallback.length }, 'Using saved edtechs ids from DB (list API unavailable)');
  }

  const concurrency = parseConcurrency();
  const delayMs = parseDelayMs();
  const limit = pLimit(concurrency);

  const items: EdtechsCompanyRaw[] = await Promise.all(
    orderedRows.map((row, index) =>
      limit(async () => {
        if (index > 0 && delayMs > 0) await sleep(delayMs);
        const { json, err } = await fetchDetail(row.id);
        return {
          position: index + 1,
          edtechId: row.id,
          period,
          listRow: Object.keys(row).length > 1 ? row : undefined,
          details: json,
          detailError: err,
        } satisfies EdtechsCompanyRaw;
      }),
    ),
  );

  const okCount = items.filter((i) => i.details).length;
  log.info({ total: items.length, withDetails: okCount }, 'Edtechs parse done');

  return [{ items }];
};

registerParser('edtechs', edtechsParser);
