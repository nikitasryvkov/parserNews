import type { RawParserOutput, SmartRankingCompany } from '../types/index.js';
import type { AdapterFn } from './types.js';
import { registerAdapter } from './registry.js';
import type { EdtechsCompanyRaw } from '../parsers/edtechs/index.js';

const SOURCE = 'ED Techs';
const SOURCE_URL = 'https://edtechs.ru/';

function companyUrlForId(id: number): string {
  return `https://edtechs.ru/?edtech_id=${id}`;
}

function asString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v.trim() || undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function segmentFrom(raw: EdtechsCompanyRaw): string | undefined {
  const lr = raw.listRow;
  if (lr?.direction_names) return String(lr.direction_names);
  const d = raw.details?.directions;
  if (Array.isArray(d) && d.length) return d.map(String).join(', ');
  return undefined;
}

function ceoFrom(raw: EdtechsCompanyRaw): string | undefined {
  const det = raw.details;
  if (det && typeof det === 'object') {
    const owner = det.owner as { name?: string } | undefined;
    if (owner?.name) return owner.name.trim();
    const founders = det.founders;
    if (Array.isArray(founders) && founders.length) return founders.map(String).join(', ');
  }
  if (raw.listRow?.owners) return String(raw.listRow.owners).trim();
  if (raw.listRow?.founders) return String(raw.listRow.founders).trim();
  return undefined;
}

interface ProceedRow {
  value?: number;
  year?: number;
  quarter?: number;
  is_rating?: boolean;
}

function annualRatingRows(proceeds: unknown): ProceedRow[] {
  if (!Array.isArray(proceeds)) return [];
  return proceeds.filter(
    (p): p is ProceedRow =>
      p !== null &&
      typeof p === 'object' &&
      (p as ProceedRow).quarter === 5 &&
      (p as ProceedRow).is_rating === true,
  );
}

function formatProceeds(raw: EdtechsCompanyRaw): {
  revenue2024q2?: string;
  revenue2025q3?: string;
  dynamics?: string;
} {
  const annual = annualRatingRows(raw.details?.proceeds).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const out: { revenue2024q2?: string; revenue2025q3?: string; dynamics?: string } = {};
  if (annual[0]) {
    out.revenue2025q3 = `${annual[0].year ?? '—'}: ${annual[0].value ?? '—'} млн ₽ (год, рейтинг)`;
  }
  if (annual[1]) {
    out.revenue2024q2 = `${annual[1].year ?? '—'}: ${annual[1].value ?? '—'} млн ₽ (год, рейтинг)`;
  }
  const lr = raw.listRow;
  if (typeof lr?.proceed_from === 'number' && typeof lr?.proceed_until === 'number') {
    out.dynamics = `${lr.proceed_from} → ${lr.proceed_until}`;
  }
  return out;
}

function adaptOne(raw: EdtechsCompanyRaw): SmartRankingCompany {
  const id = raw.edtechId;
  const nameFromDetail = asString(raw.details?.name);
  const nameFromList = raw.listRow?.name ? String(raw.listRow.name) : undefined;
  const companyName = (nameFromDetail ?? nameFromList ?? `Компания #${id}`).trim();

  const proceeds = formatProceeds(raw);
  const rawPayload: Record<string, unknown> = {
    period: raw.period,
    listRow: raw.listRow ?? null,
    details: raw.details,
  };
  if (raw.detailError) rawPayload.detailError = raw.detailError;

  return {
    position: raw.position,
    companyName,
    companyUrl: companyUrlForId(id),
    ceo: ceoFrom(raw),
    segment: segmentFrom(raw),
    revenue2024q2: proceeds.revenue2024q2,
    revenue2025q3: proceeds.revenue2025q3,
    dynamics: proceeds.dynamics,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    rawCompanyPage: rawPayload,
  };
}

const edtechsAdapter: AdapterFn = (rawData: RawParserOutput, _format) => {
  const items = (rawData.items as EdtechsCompanyRaw[] | undefined) ?? [];
  const companies = items.map(adaptOne);
  return { type: 'companies', items: companies };
};

registerAdapter('edtechs', edtechsAdapter);
