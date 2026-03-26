export type ParserName = 'tadviser' | 'ria' | 'smartranking' | 'edtechs';

export interface TriggerParserResponse {
  ok: boolean;
  parserName: ParserName;
  url: string;
}
