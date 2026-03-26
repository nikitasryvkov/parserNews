import type { ParserName } from '../../entities/parser/model/types';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const POLLING_INTERVALS = {
  health: 30_000,
  queues: 10_000,
  vpoHistory: 8_000,
} as const;

export interface ParserActionDefinition {
  name: ParserName;
  label: string;
  tone: 'btn-primary' | 'btn-secondary';
}

export const PARSER_ACTIONS: ParserActionDefinition[] = [
  { name: 'tadviser', label: 'TAdviser', tone: 'btn-primary' },
  { name: 'ria', label: 'РИА', tone: 'btn-secondary' },
  { name: 'smartranking', label: 'MedTech', tone: 'btn-secondary' },
  { name: 'edtechs', label: 'EdTech', tone: 'btn-secondary' },
];
