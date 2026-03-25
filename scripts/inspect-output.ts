import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const buf = readFileSync('c:\\Users\\sryvk\\Downloads\\VPO_svod_806ea943.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('Sheets:', wb.SheetNames);

for (const sn of wb.SheetNames) {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn]!, { header: 1, defval: '' });
  console.log(`\n========== ${sn} (${aoa.length} rows) ==========`);
  const colLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    const parts: string[] = [];
    for (let j = 0; j < row.length; j++) {
      const v = String(row[j] ?? '').trim();
      if (v) parts.push(`${colLabels[j] ?? `[${j}]`}=${v.slice(0, 40)}`);
    }
    const line = parts.join(' | ') || '(blank)';
    console.log(`  row ${String(i + 1).padStart(2)}: ${line}`);
  }
}
