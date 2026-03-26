import { useRef } from 'react';
import { useAuth } from '../../../features/auth/model/useAuth';
import { formatDateTime } from '../../../shared/lib/date/format';
import { LoadingState } from '../../../shared/ui/loading-state/LoadingState';
import { useVpoPage } from '../model/useVpoPage';

export function VpoPage() {
  const auth = useAuth();
  const canUpload = auth.hasPermission('vpo.upload');
  const canDelete = auth.hasPermission('vpo.delete');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    loading,
    error,
    items,
    uploadStatus,
    uploadStatusIsError,
    uploading,
    downloadingId,
    deletingId,
    deletingAll,
    actions,
  } = useVpoPage();

  async function handleUpload() {
    const isSuccessful = await actions.upload(fileInputRef.current?.files ?? null);

    if (isSuccessful && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Свод ВПО</h1>
          <p className="page-subtitle">Объединение нескольких .xlsx в один итоговый файл и история выгрузок</p>
        </div>
        <div className="btn-group">
          <button type="button" className="btn btn-secondary btn-sm" onClick={actions.refresh}>
            Обновить историю
          </button>
          {canDelete ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={actions.removeAll} disabled={deletingAll}>
              {deletingAll ? 'Удаление…' : 'Удалить всю историю'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="vpo-page-layout">
        <div className="vpo-page-main">
          <div className="card ria-settings-card">
            <div className="card-label">Загрузка файлов</div>
            <p className="ria-settings-hint">
              Поддерживаются только .xlsx. Для каждого набора файлов сервис формирует один объединенный итоговый файл и
              сохраняет его в историю.
            </p>
            {canUpload ? (
              <div className="vpo-upload-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="search-input vpo-file-input"
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleUpload()} disabled={uploading}>
                  {uploading ? 'Загрузка…' : 'Загрузить и обработать'}
                </button>
              </div>
            ) : (
              <p className="auth-card-note">У вашей роли есть доступ к истории, но нет права на загрузку новых файлов.</p>
            )}
            {uploadStatus ? (
              <p className={`settings-page-status${uploadStatusIsError ? ' settings-page-status-error' : ''}`}>{uploadStatus}</p>
            ) : null}
          </div>
        </div>

        <aside className="vpo-page-aside card">
          <div className="card-label">История объединенных файлов</div>
          <p className="vpo-aside-hint">Список обновляется автоматически каждые 8 секунд.</p>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <p className="settings-page-status settings-page-status-error">{error}</p>
          ) : items.length === 0 ? (
            <p className="vpo-history-empty">
              Пока нет выгрузок. После обработки загруженных файлов здесь появится объединенный .xlsx.
            </p>
          ) : (
            <div>
              {items.map((item) => (
                <div key={item.id} className="vpo-history-item">
                  <div className="vpo-history-item-title">{item.title}</div>
                  <div className="vpo-history-item-meta">
                    {formatDateTime(item.createdAt)} · строк данных: {item.rowCount} · исходных файлов: {item.sourceFiles.length}
                  </div>
                  <div className="vpo-history-item-files">{item.sourceFiles.join(', ')}</div>
                  <div className="vpo-history-item-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void actions.download(item)}
                      disabled={downloadingId === item.id}
                    >
                      {downloadingId === item.id ? 'Скачивание…' : 'Скачать .xlsx'}
                    </button>
                    {canDelete ? (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Удалить"
                        onClick={() => void actions.remove(item)}
                        disabled={deletingId === item.id}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
