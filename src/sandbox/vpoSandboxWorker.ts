import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';
import { vpoOutputToXlsxBuffer } from '../services/vpoWorkbook.js';
import type { VpoFileResult, VpoParserOutput, VpoSheetData } from '../types/vpo.js';
import { VPO_TARGET_DIRECTIONS, VPO_SHEET_PATTERNS, HEADER_ROW_END, DATA_ROW_START } from '../parsers/vpo/directions.js';

type SandboxRequest =
  | { type: 'parseWorkbook'; filePath: string; fileName: string }
  | { type: 'buildWorkbook'; output: VpoParserOutput };

type SandboxResponse =
  | { ok: true; result?: VpoFileResult; bufferBase64?: string }
  | { ok: false; error: string };

function sendResponse(message: SandboxResponse): void {
  if (process.send) process.send(message);
  setImmediate(() => process.exit(message.ok ? 0 : 1));
}

function normalizeDirection(cell: unknown): string {
  return String(cell ?? '')
    .replace(/^\s+/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function hasZipSignature(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

function findTargetSheets(wb: XLSX.WorkBook): string[] {
  const found: string[] = [];
  for (const actual of wb.SheetNames) {
    const normalized = actual
      .replace(/^Р /u, 'P')
      .replace(/^P/u, 'P')
      .replace(/\s+/g, '');

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
    0,
    ...aoa.slice(0, Math.min(30, aoa.length)).map((r) => (r as unknown[])?.length || 0),
  );
  const dataRows: VpoSheetData['dataRows'] = [];

  for (let i = DATA_ROW_START; i < aoa.length; i += 1) {
    const row = aoa[i] as unknown[] | undefined;
    if (!row?.length) continue;
    const direction = normalizeDirection(row[0]);
    if (!direction || !VPO_TARGET_DIRECTIONS.has(direction)) continue;

    const cells = Array.from({ length: totalCols }, (_, c) => row[c] ?? '');
    dataRows.push({ excelRow: i + 1, cells });
  }

  return { sheetName, headerRows, dataRows, totalCols };
}

async function parseWorkbook(filePath: string, fileName: string): Promise<VpoFileResult> {
  const buf = await readFile(filePath);
  if (!hasZipSignature(buf)) {
    throw new Error(`File "${fileName}" is not a valid .xlsx archive`);
  }

  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });
  const targetSheets = findTargetSheets(wb);
  const sheets: VpoSheetData[] = [];

  for (const actual of targetSheets) {
    const sh = wb.Sheets[actual];
    if (!sh) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: '' });
    const data = processSheet(actual, aoa);
    if (data.dataRows.length > 0) sheets.push(data);
  }

  return { fileName, sheets };
}

process.on('message', async (message: SandboxRequest) => {
  try {
    if (message.type === 'parseWorkbook') {
      const result = await parseWorkbook(message.filePath, message.fileName);
      sendResponse({ ok: true, result });
      return;
    }

    if (message.type === 'buildWorkbook') {
      const bufferBase64 = vpoOutputToXlsxBuffer(message.output).toString('base64');
      sendResponse({ ok: true, bufferBase64 });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown VPO sandbox request' });
  } catch (err) {
    sendResponse({
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown VPO sandbox error',
    });
  }
});
