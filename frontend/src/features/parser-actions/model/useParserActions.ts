import { useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import { triggerParser } from '../../../entities/parser/api/parserApi';
import type { ParserName } from '../../../entities/parser/model/types';

export function useParserActions() {
  const { pushToast } = useToast();
  const [pendingParser, setPendingParser] = useState<ParserName | null>(null);

  async function runParser(parserName: ParserName, label: string) {
    setPendingParser(parserName);

    try {
      await triggerParser(parserName);
      pushToast(`Запущено: ${label}`, 'success');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Не удалось запустить парсер', 'error');
    } finally {
      setPendingParser(null);
    }
  }

  return {
    pendingParser,
    runParser,
  };
}
