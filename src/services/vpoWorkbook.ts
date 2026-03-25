import * as XLSX from 'xlsx';
import type { VpoParserOutput, VpoFileResult, VpoSheetData } from '../types/vpo.js';

/**
 * Per-sheet column extraction (same indices as in the source Excel).
 * Не смешиваем данные разных листов в одну строку — каждая таблица (лист) идёт отдельным блоком.
 */
const BLOCK1 = { total: 4, budget: 6, paid: 10 } as const;
const BLOCK2 = { total: 11, budget: 13, paid: 17 } as const;
const TOTALS_BLOCK = { total: 4, budget: 6, paid: 12 } as const;

const COL_DIRECTION = 0;
const COL_CODE = 3;

const LEVEL_MAP: Record<string, { label: string; order: number }> = {
  '03': { label: 'Бакалавриат', order: 1 },
  '04': { label: 'Магистратура', order: 2 },
  '05': { label: 'Специалитет', order: 3 },
};

function detectLevel(code: string): { label: string; order: number } {
  const m = code.match(/^\d{2}\.(\d{2})\./);
  if (m && LEVEL_MAP[m[1]]) return LEVEL_MAP[m[1]];
  return { label: 'Другое', order: 9 };
}

function sheetOrder(sheetName: string): number {
  const m = sheetName.match(/\((\d)\)/);
  return m ? parseInt(m[1], 10) : 99;
}

function cellVal(cells: unknown[], idx: number): number | string {
  const v = cells[idx];
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : String(v).trim();
}

function extractCourse(cells: unknown[], block: { total: number; budget: number; paid: number }) {
  return {
    total: cellVal(cells, block.total),
    budget: cellVal(cells, block.budget),
    paid: cellVal(cells, block.paid),
  };
}

function sheetCaption(order: number): string {
  const t: Record<number, string> = {
    1: 'курсы 1–2',
    2: 'курсы 3–4',
    3: 'курсы 5–6',
    4: 'итоги по всем курсам',
  };
  return t[order] ?? 'таблица';
}

/** Единая ширина строки в листе (лист итогов дополняется пустыми ячейками). */
const COLS_WIDE = 9;

function padRow(row: unknown[], width: number): unknown[] {
  const out = [...row];
  while (out.length < width) out.push('');
  return out.slice(0, width);
}

function buildSheetHeaderRows(order: number): unknown[][] {
  if (order === 4) {
    return [
      padRow(['Направление подготовки', 'Уровень', 'Код', 'Итого', '', ''], COLS_WIDE),
      padRow(['', '', '', 'Всего', 'Бюджет', 'Платное'], COLS_WIDE),
    ];
  }
  const [a, b] = order === 1 ? [1, 2] : order === 2 ? [3, 4] : [5, 6];
  return [
    ['Направление подготовки', 'Уровень', 'Код', `${a} курс`, '', '', `${b} курс`, '', ''],
    ['', '', '', 'Всего', 'Бюджет', 'Платное', 'Всего', 'Бюджет', 'Платное'],
  ];
}

function sortDataRows(sheet: VpoSheetData): typeof sheet.dataRows {
  return [...sheet.dataRows].sort((x, y) => {
    const cx = String(x.cells[COL_CODE] ?? '').trim();
    const cy = String(y.cells[COL_CODE] ?? '').trim();
    const lx = detectLevel(cx);
    const ly = detectLevel(cy);
    if (lx.order !== ly.order) return lx.order - ly.order;
    const dx = String(x.cells[COL_DIRECTION] ?? '').replace(/^\s+/, '').trim();
    const dy = String(y.cells[COL_DIRECTION] ?? '').replace(/^\s+/, '').trim();
    return dx.localeCompare(dy, 'ru');
  });
}

function rowFromCells(order: number, cells: unknown[]): unknown[] {
  const direction = String(cells[COL_DIRECTION] ?? '').replace(/^\s+/, '').trim();
  const code = String(cells[COL_CODE] ?? '').trim();
  const lvl = detectLevel(code);

  if (order === 4) {
    const t = extractCourse(cells, TOTALS_BLOCK);
    return padRow([direction, lvl.label, code, t.total, t.budget, t.paid], COLS_WIDE);
  }
  const b1 = extractCourse(cells, BLOCK1);
  const b2 = extractCourse(cells, BLOCK2);
  return [
    direction,
    lvl.label,
    code,
    b1.total,
    b1.budget,
    b1.paid,
    b2.total,
    b2.budget,
    b2.paid,
  ];
}

function appendFileSections(aoa: unknown[][], file: VpoFileResult, multiFile: boolean): void {
  if (multiFile) {
    const label = Array(COLS_WIDE).fill('');
    label[0] = file.fileName;
    aoa.push(label);
    aoa.push(Array(COLS_WIDE).fill(''));
  }

  const sortedSheets = [...file.sheets].sort((a, b) => sheetOrder(a.sheetName) - sheetOrder(b.sheetName));

  for (let si = 0; si < sortedSheets.length; si++) {
    const sh = sortedSheets[si];
    const order = sheetOrder(sh.sheetName);

    if (si > 0) {
      aoa.push(Array(COLS_WIDE).fill(''));
    }

    const title = Array(COLS_WIDE).fill('');
    title[0] = `${sh.sheetName} — ${sheetCaption(order)}`;
    aoa.push(title);

    const hdr = buildSheetHeaderRows(order);
    aoa.push(...hdr);

    const rows = sortDataRows(sh);
    for (const dr of rows) {
      aoa.push(rowFromCells(order, dr.cells));
    }
  }
}

export function vpoOutputToWorkbook(output: VpoParserOutput): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const aoa: unknown[][] = [];

  const title = Array(COLS_WIDE).fill('');
  title[0] = 'Свод ВПО (по листам: данные не объединяются между таблицами)';
  aoa.push(title);
  aoa.push(Array(COLS_WIDE).fill(''));

  const multi = output.files.length > 1;
  let first = true;
  for (const file of output.files) {
    if (!first) {
      aoa.push(Array(COLS_WIDE).fill(''));
    }
    first = false;
    appendFileSections(aoa, file, multi);
  }

  const hasData = output.files.some((f) => f.sheets.some((s) => s.dataRows.length > 0));
  if (!hasData) {
    aoa.push(Array(COLS_WIDE).fill(''));
    const empty = Array(COLS_WIDE).fill('');
    empty[0] = 'Нет данных';
    aoa.push(empty);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 42 },
    { wch: 16 },
    { wch: 12 },
    ...Array(COLS_WIDE - 3).fill({ wch: 12 }),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Свод');
  return wb;
}

export function vpoOutputToXlsxBuffer(output: VpoParserOutput): Buffer {
  const wb = vpoOutputToWorkbook(output);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
