import * as XLSX from 'xlsx';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const files = [
  'c:\\Users\\sryvk\\Downloads\\СВОД_ВПО1_ВСЕГО.xls',
];

// Also check if there's a СВОД_ВПО1_ВСЕГО1.xlsx
try {
  const dir = 'c:\\Users\\sryvk\\Downloads';
  const all = readdirSync(dir).filter(f => /СВОД.*ВПО/i.test(f) || /свод.*впо/i.test(f) || /svod.*vpo/i.test(f));
  for (const f of all) {
    const full = join(dir, f);
    if (!files.includes(full)) files.push(full);
  }
} catch {}

for (const fp of files) {
  try {
    const buf = readFileSync(fp);
    const wb = XLSX.read(buf, { type: 'buffer' });
    console.log(`\n=== ${fp.split(/[\\/]/).pop()} ===`);
    console.log(`Sheet count: ${wb.SheetNames.length}`);
    for (const sn of wb.SheetNames) {
      const hex = [...sn].map(c => `U+${c.codePointAt(0)!.toString(16).padStart(4, '0')}`).join(' ');
      const match = findMatch(sn);
      console.log(`  "${sn}" → ${match ? `MATCHED as order ${match}` : 'NO MATCH'}`);
      console.log(`    hex: ${hex}`);
    }
  } catch (err) {
    console.log(`Cannot read ${fp}: ${err}`);
  }
}

function findMatch(actual: string): number | null {
  const VPO_SHEET_PATTERNS = [
    '2_1_2(1)', '2_1_2 (1)',
    '2_1_2(2)', '2_1_2 (2)',
    '2_1_2(3)', '2_1_2 (3)',
    '2_1_2(4)', '2_1_2 (4)',
  ];

  const normalized = actual
    .replace(/^Р/u, 'P')
    .replace(/^P/u, 'P')
    .replace(/\s+/g, '');

  console.log(`    normalized: "${normalized}"`);

  for (const pattern of VPO_SHEET_PATTERNS) {
    const normPattern = pattern.replace(/\s+/g, '');
    if (normalized.endsWith(normPattern) || normalized.includes(normPattern)) {
      const m = normPattern.match(/\((\d)\)/);
      return m ? parseInt(m[1]) : null;
    }
  }
  return null;
}
