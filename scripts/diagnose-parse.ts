import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const VPO_TARGET_DIRECTIONS = new Set([
  'Химия', 'Химия, физика и механика материалов',
  'Биология', 'Биотехнические системы и технологии', 'Биотехнология',
  'Сестринское дело', 'Биоинженерия и биоинформатика',
  'Фундаментальная и прикладная биология', 'Медицинская биохимия',
  'Медицинская биофизика', 'Медицинская кибернетика',
  'Лечебное дело', 'Педиатрия', 'Стоматология', 'Остеопатия',
  'Медико-профилактическое дело', 'Фармация', 'Ветеринария',
  'Клиническая психология', 'Химическая технология', 'Психология',
]);

const HEADER_ROW_END = 10;
const DATA_ROW_START = 10;

const VPO_SHEET_PATTERNS = ['2_1_2(1)', '2_1_2 (1)', '2_1_2(2)', '2_1_2 (2)', '2_1_2(3)', '2_1_2 (3)', '2_1_2(4)', '2_1_2 (4)'];

function normalizeDirection(cell: unknown): string {
  return String(cell ?? '').replace(/^\s+/u, '').replace(/\s+/gu, ' ').trim();
}

function findTargetSheets(wb: XLSX.WorkBook): string[] {
  const found: string[] = [];
  for (const actual of wb.SheetNames) {
    const normalized = actual.replace(/^Р/u, 'P').replace(/^P/u, 'P').replace(/\s+/g, '');
    for (const pattern of VPO_SHEET_PATTERNS) {
      const normPattern = pattern.replace(/\s+/g, '');
      if (normalized.endsWith(normPattern) || normalized.includes(normPattern)) {
        if (!found.includes(actual)) found.push(actual);
        break;
      }
    }
  }
  return found;
}

const fp = 'c:\\Users\\sryvk\\Downloads\\СВОД_ВПО1_ВСЕГО.xls';
const buf = readFileSync(fp);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });

const targets = findTargetSheets(wb);
console.log(`Target sheets: ${targets.join(', ')}`);

for (const sn of targets) {
  const sh = wb.Sheets[sn];
  if (!sh) { console.log(`  ${sn}: sheet object is null!`); continue; }

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '' });
  console.log(`\n=== ${sn} === (${aoa.length} rows)`);

  let matched = 0;
  let skipped = 0;
  const sampleSkips: string[] = [];

  for (let i = DATA_ROW_START; i < aoa.length; i++) {
    const row = aoa[i] as unknown[] | undefined;
    if (!row?.length) continue;
    const raw = row[0];
    const direction = normalizeDirection(raw);
    if (!direction) continue;

    if (VPO_TARGET_DIRECTIONS.has(direction)) {
      matched++;
      if (matched <= 3) {
        console.log(`  MATCHED row ${i + 1}: "${direction}" code=${row[3]} E=${row[4]} L=${row[11]}`);
      }
    } else {
      skipped++;
      if (sampleSkips.length < 5 && direction.length > 2) {
        const hexFirst3 = [...direction.slice(0, 5)].map(c => `U+${c.codePointAt(0)!.toString(16).padStart(4, '0')}`).join(' ');
        sampleSkips.push(`row ${i + 1}: "${direction.slice(0, 40)}" (hex: ${hexFirst3})`);
      }
    }
  }

  console.log(`  Total matched: ${matched}, skipped: ${skipped}`);
  if (sampleSkips.length > 0) {
    console.log(`  Sample skipped:`);
    for (const s of sampleSkips) console.log(`    ${s}`);
  }

  // Also check Химия specifically
  for (let i = DATA_ROW_START; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    const raw = String(row?.[0] ?? '');
    if (raw.includes('Хим') || raw.includes('хим')) {
      const dir = normalizeDirection(raw);
      const inSet = VPO_TARGET_DIRECTIONS.has(dir);
      const hex = [...dir.slice(0, 8)].map(c => `U+${c.codePointAt(0)!.toString(16).padStart(4, '0')}`).join(' ');
      console.log(`  Химия-like row ${i + 1}: "${dir.slice(0, 50)}" inSet=${inSet} hex=${hex}`);
      break;
    }
  }
}
