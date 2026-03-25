/** One extracted data row — keeps ALL columns from the original sheet. */
export interface VpoDataRow {
  excelRow: number;
  cells: unknown[];
}

/** Parsed data from a single sheet of a single file. */
export interface VpoSheetData {
  sheetName: string;
  /** Header rows (the first ~10 rows: title, column names, sub-headers, col numbers). */
  headerRows: unknown[][];
  /** Only those data rows whose direction (col A) matches the target list. */
  dataRows: VpoDataRow[];
  totalCols: number;
}

/** Parsed result for a single file. */
export interface VpoFileResult {
  fileName: string;
  sheets: VpoSheetData[];
}

/** Top-level parser output stored as raw JSON. */
export interface VpoParserOutput {
  files: VpoFileResult[];
}

/** Legacy type kept for backward compat in case anything references it. */
export interface VpoExtractedRow {
  dataYear: string;
  fileName: string;
  sheetName: string;
  excelRow: number;
  direction: string;
  sheetCaption: string;
  columnD: { header: string; value: string };
  columnE: { header: string; value: string };
  columnL: { header: string; value: string };
}
