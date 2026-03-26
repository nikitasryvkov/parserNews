import { useEffect, useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import { fetchRiaSettings, updateRiaSettings } from '../../../entities/ria-settings/api/riaSettingsApi';

interface RiaSettingsFormState {
  lentaPages: string;
  pageDelayMs: string;
  puppeteerSettleMs: string;
}

const INITIAL_FORM_STATE: RiaSettingsFormState = {
  lentaPages: '',
  pageDelayMs: '',
  puppeteerSettleMs: '',
};

export function useRiaSettingsPage() {
  const { pushToast } = useToast();
  const [form, setForm] = useState<RiaSettingsFormState>(INITIAL_FORM_STATE);
  const [statusText, setStatusText] = useState('Загрузка…');
  const [statusIsError, setStatusIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetchRiaSettings();
        if (cancelled) return;

        setForm({
          lentaPages: String(response.settings.lentaPages),
          pageDelayMs: String(response.settings.pageDelayMs),
          puppeteerSettleMs: String(response.settings.puppeteerSettleMs),
        });
        setStatusText('');
        setStatusIsError(false);
      } catch (error) {
        if (cancelled) return;

        setStatusText(`Не удалось загрузить настройки: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setStatusIsError(true);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function setField(field: keyof RiaSettingsFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveSettings() {
    const lentaPages = Number.parseInt(form.lentaPages, 10);
    const pageDelayMs = Number.parseInt(form.pageDelayMs, 10);
    const puppeteerSettleMs = Number.parseInt(form.puppeteerSettleMs, 10);

    if (Number.isNaN(lentaPages) || lentaPages < 1 || lentaPages > 50) {
      pushToast('Порций ленты должно быть от 1 до 50', 'error');
      return;
    }

    if (Number.isNaN(pageDelayMs) || pageDelayMs < 0 || pageDelayMs > 10000) {
      pushToast('Пауза между порциями должна быть от 0 до 10000 мс', 'error');
      return;
    }

    if (Number.isNaN(puppeteerSettleMs) || puppeteerSettleMs < 0 || puppeteerSettleMs > 30000) {
      pushToast('Ожидание Puppeteer должно быть от 0 до 30000 мс', 'error');
      return;
    }

    setSaving(true);

    try {
      const response = await updateRiaSettings({
        lentaPages,
        pageDelayMs,
        puppeteerSettleMs,
      });

      setForm({
        lentaPages: String(response.settings.lentaPages),
        pageDelayMs: String(response.settings.pageDelayMs),
        puppeteerSettleMs: String(response.settings.puppeteerSettleMs),
      });
      setStatusText('Настройки сохранены');
      setStatusIsError(false);
      pushToast('Настройки РИА сохранены', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить настройки';
      setStatusText(message);
      setStatusIsError(true);
      pushToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    statusText,
    statusIsError,
    saving,
    actions: {
      setField,
      saveSettings,
    },
  };
}
