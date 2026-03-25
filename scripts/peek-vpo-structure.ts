import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = process.argv[2] || 'c:\\Users\\sryvk\\Downloads\\СВОД_ВПО1_ВСЕГО.xls';
const buf = readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });

console.log('=== Sheet names ===');
console.log(wb.SheetNames);

const TARGET_SHEETS = ['P2_1_2', 'P2_1_2(2)', 'P2_1_2(3)', 'Р2_1_2', 'Р2_1_2(2)', 'Р2_1_2(3)'];

for (const sn of wb.SheetNames) {
  if (!TARGET_SHEETS.some(t => sn === t || sn.includes('2_1_2'))) continue;

  console.log(`\n========== Sheet: "${sn}" ==========`);
  const sh = wb.Sheets[sn];
  if (!sh) continue;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '' });

  console.log(`Total rows: ${aoa.length}`);

  // Print first 15 rows to understand header structure
  console.log('\n--- First 15 rows (headers area) ---');
  for (let i = 0; i < Math.min(15, aoa.length); i++) {
    const row = aoa[i] as unknown[];
    const colA = String(row?.[0] ?? '').trim().slice(0, 60);
    const colB = String(row?.[1] ?? '').trim().slice(0, 30);
    const colC = String(row?.[2] ?? '').trim().slice(0, 30);
    const colD = String(row?.[3] ?? '').trim().slice(0, 30);
    const colE = String(row?.[4] ?? '').trim().slice(0, 30);
    const colL = String(row?.[11] ?? '').trim().slice(0, 30);
    console.log(`  row ${i + 1}: A="${colA}" | B="${colB}" | C="${colC}" | D="${colD}" | E="${colE}" | L="${colL}"`);
  }

  // Find target directions and print a few
  const TARGETS = new Set([
    'Химия', 'Биология', 'Лечебное дело', 'Педиатрия', 'Стоматология',
    'Фармация', 'Сестринское дело', 'Биотехнология', 'Психология',
  ]);

  console.log('\n--- Rows matching target directions ---');
  let found = 0;
  for (let i = 0; i < aoa.length && found < 8; i++) {
    const row = aoa[i] as unknown[];
    const colA = String(row?.[0] ?? '').replace(/^\s+/, '').replace(/\s+/g, ' ').trim();
    if (TARGETS.has(colA)) {
      found++;
      const cols = (row || []).map((c, idx) => `${String.fromCharCode(65 + Math.min(idx, 25))}="${String(c ?? '').trim().slice(0, 25)}"`);
      console.log(`  row ${i + 1}: ${cols.slice(0, 13).join(' | ')}`);
    }
  }

  // Print column count
  const maxCols = Math.max(...aoa.slice(0, 30).map(r => (r as unknown[])?.length || 0));
  console.log(`\nMax columns in first 30 rows: ${maxCols}`);
}
