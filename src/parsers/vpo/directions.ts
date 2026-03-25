export const VPO_TARGET_DIRECTIONS = new Set<string>([
  'Химия',
  'Химия, физика и механика материалов',
  'Биология',
  'Биотехнические системы и технологии',
  'Биотехнология',
  'Сестринское дело',
  'Биоинженерия и биоинформатика',
  'Фундаментальная и прикладная биология',
  'Медицинская биохимия',
  'Медицинская биофизика',
  'Медицинская кибернетика',
  'Лечебное дело',
  'Педиатрия',
  'Стоматология',
  'Остеопатия',
  'Медико-профилактическое дело',
  'Фармация',
  'Ветеринария',
  'Клиническая психология',
  'Химическая технология',
  'Психология',
]);

/**
 * Logical sheet names to look for inside workbooks.
 * Real files use variations: Р2_1_2(1), Р2_1_2 (2), P2_1_2(1), etc.
 * The parser uses fuzzy matching via resolveSheetName().
 */
export const VPO_SHEET_PATTERNS = [
  '2_1_2(1)', '2_1_2 (1)',
  '2_1_2(2)', '2_1_2 (2)',
  '2_1_2(3)', '2_1_2 (3)',
  '2_1_2(4)', '2_1_2 (4)',
] as const;

/** Header area: rows 0..HEADER_END (0-indexed) are headers, data starts after. */
export const HEADER_ROW_END = 10;
export const DATA_ROW_START = 10;
