/**
 * End-to-end test: parse → build workbook → verify output.
 * Uses the SAME code paths as the real app.
 */
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { VPO_TARGET_DIRECTIONS, VPO_SHEET_PATTERNS, HEADER_ROW_END, DATA_ROW_START } from '../src/parsers/vpo/directions.js';
import type { VpoSheetData, VpoFileResult, VpoParserOutput, VpoDataRow } from '../src/types/vpo.js';
import { vpoOutputToXlsxBuffer } from '../src/services/vpoWorkbook.js';

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

function processSheet(sheetName: string, aoa: unknown[][]): VpoSheetData {
  const headerRows = aoa.slice(0, HEADER_ROW_END).map((r) => [...(r as unknown[])]);
  const totalCols = Math.max(
    ...aoa.slice(0, Math.min(30, aoa.length)).map((r) => (r as unknown[])?.length || 0),
  );
  const dataRows: VpoDataRow[] = [];
  for (let i = DATA_ROW_START; i < aoa.length; i++) {
    const row = aoa[i] as unknown[] | undefined;
    if (!row?.length) continue;
    const direction = normalizeDirection(row[0]);
    if (!direction || !VPO_TARGET_DIRECTIONS.has(direction)) continue;
    const cells = Array.from({ length: totalCols }, (_, c) => row[c] ?? '');
    dataRows.push({ excelRow: i + 1, cells });
  }
  return { sheetName, headerRows, dataRows, totalCols };
}

function processWorkbook(filePath: string, fileName: string): VpoFileResult {
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });
  const targetSheets = findTargetSheets(wb);
  console.log(`  ${fileName}: target sheets = ${targetSheets.join(', ')}`);

  const sheets: VpoSheetData[] = [];
  for (const actual of targetSheets) {
    const sh = wb.Sheets[actual];
    if (!sh) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '' });
    const data = processSheet(actual, aoa);
    console.log(`    ${actual}: ${data.dataRows.length} data rows, totalCols=${data.totalCols}`);
    if (data.dataRows.length > 0) {
      // Show one sample row
      const sample = data.dataRows[0];
      console.log(`      sample: dir="${sample.cells[0]}" code=${sample.cells[3]} E=${sample.cells[4]} G=${sample.cells[6]} K=${sample.cells[10]} L=${sample.cells[11]}`);
      sheets.push(data);
    }
  }
  return { fileName, sheets };
}

// Process the test file
const testFile = 'c:\\Users\\sryvk\\Downloads\\СВОД_ВПО1_ВСЕГО.xls';
console.log('Processing file...');
const file = processWorkbook(testFile, 'СВОД_ВПО1_ВСЕГО.xls');

const output: VpoParserOutput = { files: [file] };
console.log(`\nFile has ${file.sheets.length} sheets in output`);

// Build workbook using the REAL workbook builder
const buf = vpoOutputToXlsxBuffer(output);
writeFileSync('c:\\Project\\ParserNews\\test-e2e.xlsx', buf);
console.log(`Output: ${buf.length} bytes`);

// Verify output
const outWb = XLSX.read(buf, { type: 'buffer' });
const outAoa = XLSX.utils.sheet_to_json<unknown[]>(outWb.Sheets['Свод']!, { header: 1, defval: '' });
console.log(`\nOutput has ${outAoa.length} rows`);

// Find Биология Бакалавриат row
for (let i = 2; i < outAoa.length; i++) {
  const row = outAoa[i] as unknown[];
  if (String(row[0]).startsWith('Биол') && String(row[1]) === 'Бакалавриат') {
    console.log(`\nБиология Бакалавриат (row ${i+1}):`);
    console.log(`  Course 1: всего=${row[3]}, бюджет=${row[4]}, платное=${row[5]}`);
    console.log(`  Course 2: всего=${row[6]}, бюджет=${row[7]}, платное=${row[8]}`);
    console.log(`  Course 3: всего=${row[9]}, бюджет=${row[10]}, платное=${row[11]}`);
    console.log(`  Итого:    всего=${row[21]}, бюджет=${row[22]}, платное=${row[23]}`);
    break;
  }
}

// Check for empty course columns
let emptyCoursesCount = 0;
for (let i = 2; i < outAoa.length; i++) {
  const row = outAoa[i] as unknown[];
  if (!row[0] || !row[2]) continue; // skip blanks and headers
  const c1 = row[3];
  if (c1 === '' || c1 === undefined || c1 === null || c1 === 0) {
    if (String(row[0]).length > 3) {
      emptyCoursesCount++;
      if (emptyCoursesCount <= 3) {
        console.log(`  WARNING: empty course 1 for "${row[0]}" (${row[1]}) - code=${row[2]} | totals: ${row[21]}`);
      }
    }
  }
}
if (emptyCoursesCount > 0) {
  console.log(`\n⚠ ${emptyCoursesCount} rows have empty course 1 data`);
} else {
  console.log(`\n✓ All data rows have course data filled`);
}
