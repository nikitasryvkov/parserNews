import { requestJson } from '../../../shared/api/http/client';
import type { ParserName, TriggerParserResponse } from '../model/types';

export function triggerParser(parserName: ParserName): Promise<TriggerParserResponse> {
  return requestJson<TriggerParserResponse>(`/parse/${encodeURIComponent(parserName)}`, {
    method: 'POST',
  });
}
