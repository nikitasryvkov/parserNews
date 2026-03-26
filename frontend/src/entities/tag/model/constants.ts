import type { TagMode } from './types';

export const TAG_MODE_LABELS: Record<TagMode, string> = {
  phrase: 'Фраза',
  words: 'Все слова',
  prefix: 'Префикс',
  regex: 'Regex',
};

export const TAG_MODE_HINTS: Record<TagMode, string> = {
  phrase: 'Ищет точное вхождение подстроки в тексте.',
  words: 'Все слова тега должны присутствовать в любом порядке.',
  prefix: 'Каждое слово трактуется как префикс.',
  regex: 'Регулярное выражение в синтаксисе JavaScript.',
};
