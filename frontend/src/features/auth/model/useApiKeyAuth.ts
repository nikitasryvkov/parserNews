import { useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import { confirmAction, promptText } from '../../../shared/lib/browser/dialogs';
import { clearApiKey, getApiKey, hasApiKey, setApiKey } from '../../../shared/lib/storage/apiKeyStorage';

export function useApiKeyAuth() {
  const { pushToast } = useToast();
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(hasApiKey());
  const [version, setVersion] = useState(0);

  function requestApiKeyUpdate() {
    const currentValue = getApiKey();
    const nextValue = promptText('Введите API key для доступа к /api', currentValue);

    if (nextValue === null) return;

    setApiKey(nextValue);
    const nextState = hasApiKey();

    setIsApiKeyConfigured(nextState);
    setVersion((current) => current + 1);
    pushToast(nextState ? 'API key сохранен' : 'API key очищен', 'success');
  }

  function clearStoredApiKey() {
    if (isApiKeyConfigured && !confirmAction('Очистить сохранённый API key?')) return;

    clearApiKey();
    setIsApiKeyConfigured(false);
    setVersion((current) => current + 1);
    pushToast('API key очищен', 'info');
  }

  return {
    hasApiKey: isApiKeyConfigured,
    version,
    requestApiKeyUpdate,
    clearStoredApiKey,
  };
}
