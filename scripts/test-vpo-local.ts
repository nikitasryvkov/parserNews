import { readdir } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';

// Simulate the parser logic locally on the real file
const TARGET_DIRS = new Set([
  'Химия', 'Химия, физика и механика материалов', 'Биология',
  'Биотехнические системы и технологии', 'Биотехнология', 'Сестринское дело',
  'Биоинженерия и биоинформатика', 'Фундаментальная и прикладная биология',
  'Медицинская биохимия', 'Медицинская биофизика', 'Медицинская кибернетика',
  'Лечебное дело', 'Педиатрия', 'Стоматология', 'Остеопатия',
  'Медико-профилактическое дело', 'Фармация', 'Ветеринария',
  'Клиническая психология', 'Химическая технология', 'Психология',
]);

const PATTERNS = ['2_1_2(1)', '2_1_2 (1)', '2_1_2(2)', '2_1_2 (2)', '2_1_2(3)', '2_1_2 (3)', '2_1_2(4)', '2_1_2 (4)'];
const HEADER_END = 10;
const DATA_START = 10;

const filePath = process.argv[2] || 'c:\\Users\\sryvk\\Downloads\\СВОД_ВПО1_ВСЕГО.xls';
const buf = await import('fs').then(fs => fs.readFileSync(filePath));
const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });

function findSheets(wb: XLSX.WorkBook): string[] {
  const found: string[] = [];
  for (const actual of wb.SheetNames) {
    const norm = actual.replace(/^[PРр]/u, 'P').replace(/\s+/g, '');
    for (const p of PATTERNS) {
      if (norm.includes(p.replace(/\s+/g, ''))) {
        if (!found.includes(actual)) found.push(actual);
        break;
      }
    }
  }
  return found;
}

const sheets = findSheets(wb);
console.log('Found sheets:', sheets);

for (const sn of sheets) {
  const sh = wb.Sheets[sn];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '' });

  console.log(`\n--- Sheet "${sn}" ---`);
  console.log(`Header rows (6-10):`);
  for (let i = 5; i < HEADER_END; i++) {
    const row = aoa[i] as unknown[];
    console.log(`  row ${i+1}: A="${String(row?.[0]??'').slice(0,50)}" D="${String(row?.[3]??'').slice(0,30)}" E="${String(row?.[4]??'').slice(0,30)}" L="${String(row?.[11]??'').slice(0,30)}"`);
  }

  let count = 0;
  for (let i = DATA_START; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    const dir = String(row?.[0] ?? '').replace(/^\s+/, '').replace(/\s+/g, ' ').trim();
    if (TARGET_DIRS.has(dir)) count++;
  }
  console.log(`Matching rows: ${count}`);
}

// Test output workbook generation
const { vpoOutputToWorkbook } = await import('../src/services/vpoWorkbook.js');
import type { VpoParserOutput, VpoSheetData, VpoFileResult } from '../src/types/vpo.js';

const fileResults: VpoFileResult[] = [];
for (const sn of sheets) {
  const sh = wb.Sheets[sn];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '' });
  const headerRows = aoa.slice(0, HEADER_END).map(r => [...(r as unknown[])]);
  const maxCols = Math.max(...aoa.slice(0,30).map(r => (r as unknown[])?.length || 0));
  const dataRows: {excelRow: number; cells: unknown[]}[] = [];

  for (let i = DATA_START; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    const dir = String(row?.[0] ?? '').replace(/^\s+/, '').replace(/\s+/g, ' ').trim();
    if (!TARGET_DIRS.has(dir)) continue;
    const cells = Array.from({length: maxCols}, (_, c) => row[c] ?? '');
    dataRows.push({ excelRow: i+1, cells });
  }

  if (!fileResults.length) fileResults.push({ fileName: 'test.xls', sheets: [] });
  fileResults[0].sheets.push({ sheetName: sn, headerRows, dataRows, totalCols: maxCols });
}

const output: VpoParserOutput = { files: fileResults };
const outWb = vpoOutputToWorkbook(output);
console.log('\n=== Output workbook ===');
console.log('Sheets:', outWb.SheetNames);
for (const osn of outWb.SheetNames) {
  const osh = outWb.Sheets[osn];
  const oAoa = XLSX.utils.sheet_to_json<unknown[]>(osh, { header: 1, defval: '' });
  console.log(`Sheet "${osn}": ${oAoa.length} rows`);
  // Print first 12 rows to verify headers
  for (let i = 0; i < Math.min(12, oAoa.length); i++) {
    const r = oAoa[i] as unknown[];
    console.log(`  row ${i+1}: A="${String(r?.[0]??'').slice(0,40)}" E="${String(r?.[4]??'').slice(0,25)}" L="${String(r?.[11]??'').slice(0,25)}"`);
  }
  console.log('  ...');
  // Print last 3 data rows
  for (let i = Math.max(12, oAoa.length - 3); i < oAoa.length; i++) {
    const r = oAoa[i] as unknown[];
    console.log(`  row ${i+1}: A="${String(r?.[0]??'').slice(0,40)}" E="${String(r?.[4]??'').slice(0,25)}" L="${String(r?.[11]??'').slice(0,25)}"`);
  }
}
