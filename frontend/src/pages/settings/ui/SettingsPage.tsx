import { useRiaSettingsPage } from '../model/useRiaSettingsPage';

export function SettingsPage() {
  const { form, statusText, statusIsError, saving, actions } = useRiaSettingsPage();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Настройки</h1>
          <p className="page-subtitle">
            Лента РИА Новости (<code>ria.ru/lenta/</code>)
          </p>
        </div>
      </div>

      <div className="card ria-settings-card">
        <div className="card-label">Глубина ленты и тайминги</div>
        <p className="ria-settings-hint">
          Первая порция берётся с главной ленты, следующие через блок «ещё 20 материалов». Запросы к РИА
          всегда идут на сайт заново, а в базу попадают только новости, проходящие фильтр тегов.
        </p>
        {statusText ? (
          <p className={`settings-page-status${statusIsError ? ' settings-page-status-error' : ''}`}>{statusText}</p>
        ) : null}
        <form
          className="ria-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            void actions.saveSettings();
          }}
        >
          <label className="ria-setting">
            <span className="ria-setting-label">Порций (блоков)</span>
            <input
              type="number"
              className="search-input ria-setting-input"
              min="1"
              max="50"
              step="1"
              value={form.lentaPages}
              onChange={(event) => actions.setField('lentaPages', event.target.value)}
            />
          </label>
          <label className="ria-setting">
            <span className="ria-setting-label">Пауза между порциями (мс)</span>
            <input
              type="number"
              className="search-input ria-setting-input"
              min="0"
              max="10000"
              step="50"
              value={form.pageDelayMs}
              onChange={(event) => actions.setField('pageDelayMs', event.target.value)}
            />
          </label>
          <label className="ria-setting">
            <span className="ria-setting-label">Ожидание после загрузки Puppeteer (мс)</span>
            <input
              type="number"
              className="search-input ria-setting-input"
              min="0"
              max="30000"
              step="100"
              value={form.puppeteerSettleMs}
              onChange={(event) => actions.setField('puppeteerSettleMs', event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </form>
      </div>
    </>
  );
}
