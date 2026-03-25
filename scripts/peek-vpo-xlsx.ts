import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';

const p = process.argv[2] || 'c:/Users/sryvk/Downloads/СВОД_ВПО1_ВСЕГО.xlsx';
if (!existsSync(p)) {
  console.error('File not found:', p);
  process.exit(1);
}
const wb = XLSX.read(readFileSync(p), { type: 'buffer' });
/* В файле — кириллическая Р, не латинская P */
const sn = ['Р2_1_2', 'Р2_1_2(2)', 'Р2_1_2(3)'];
console.log('Sheet count', wb.SheetNames.length);
console.log('Has Р2_1_2 sheets:', sn.map((n) => [n, wb.SheetNames.includes(n)]));
for (const s of sn) {
  const sh = wb.Sheets[s];
  if (!sh) {
    console.log('MISSING', s);
    continue;
  }
  const aoa = XLSX.utils.sheet_to_json<(string | number)[]>(sh, { header: 1, defval: '' });
  console.log('\n===', s, 'rows', aoa.length, '===');
  for (let i = 0; i < Math.min(25, aoa.length); i++) {
    const row = aoa[i] || [];
    const slice = row.slice(0, 15).map((c) => (typeof c === 'string' ? c.slice(0, 60) : c));
    console.log(i, JSON.stringify(slice));
  }
}
