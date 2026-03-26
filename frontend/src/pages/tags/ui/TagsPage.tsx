import { TAG_MODE_HINTS, TAG_MODE_LABELS } from '../../../entities/tag/model/constants';
import type { TagItem, TagMode } from '../../../entities/tag/model/types';
import { EmptyState } from '../../../shared/ui/empty-state/EmptyState';
import { ErrorCard } from '../../../shared/ui/error-card/ErrorCard';
import { LoadingState } from '../../../shared/ui/loading-state/LoadingState';
import { useTagsPage } from '../model/useTagsPage';

interface TagChipProps {
  tag: TagItem;
  onToggleExclude: (tag: TagItem) => void;
  onDelete: (tag: TagItem) => void;
  onModeChange: (tag: TagItem, nextMode: TagMode) => void;
}

function TagChip({ tag, onToggleExclude, onDelete, onModeChange }: TagChipProps) {
  return (
    <span className={`tag-chip${tag.exclude ? ' tag-chip-exclude' : ''}`}>
      <select
        className="tag-chip-mode-select"
        value={tag.mode}
        title={TAG_MODE_HINTS[tag.mode]}
        onChange={(event) => onModeChange(tag, event.target.value as TagMode)}
      >
        {Object.entries(TAG_MODE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <span className="tag-chip-text">{tag.tag}</span>
      <button
        type="button"
        className="tag-chip-toggle"
        title={tag.exclude ? 'Сделать включающим' : 'Сделать исключающим'}
        onClick={() => onToggleExclude(tag)}
      >
        {tag.exclude ? '↩' : '⛔'}
      </button>
      <button type="button" className="tag-chip-remove" title="Удалить" onClick={() => onDelete(tag)}>
        ×
      </button>
    </span>
  );
}

export function TagsPage() {
  const { loading, error, tags, form, actions } = useTagsPage();
  const includeTags = tags.filter((tag) => !tag.exclude);
  const excludeTags = tags.filter((tag) => tag.exclude);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Теги фильтра TAdviser</h1>
          <p className="page-subtitle">Статья проходит, если совпал хотя бы один включающий тег и ни один исключающий</p>
        </div>
        <div className="btn-group">
          <button type="button" className="btn btn-secondary btn-sm" onClick={actions.restoreDefaultTags}>
            По умолчанию
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={actions.removeAllTags}>
            Удалить все
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-label">Добавить тег</div>
        <form
          className="tag-add-form"
          onSubmit={(event) => {
            event.preventDefault();
            void actions.submitTag();
          }}
        >
          <input
            className="search-input"
            type="text"
            placeholder="Текст тега..."
            value={form.value}
            onChange={(event) => actions.setTagValue(event.target.value)}
          />
          <select className="tag-mode-select" value={form.mode} onChange={(event) => actions.setMode(event.target.value as TagMode)}>
            {Object.entries(TAG_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="tag-exclude-label">
            <input type="checkbox" checked={form.exclude} onChange={(event) => actions.setExclude(event.target.checked)} /> Исключить
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={form.submitting}>
            {form.submitting ? 'Добавление…' : 'Добавить'}
          </button>
        </form>
        <div className="tag-mode-hint">{TAG_MODE_HINTS[form.mode]}</div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorCard message={error} />
      ) : (
        <>
          <div className="cards">
            <div className="card card-success">
              <div className="card-label">Включающие теги</div>
              <div className="card-value">{includeTags.length}</div>
            </div>
            <div className="card card-danger">
              <div className="card-label">Исключающие теги</div>
              <div className="card-value">{excludeTags.length}</div>
            </div>
            <div className="card">
              <div className="card-label">Всего</div>
              <div className="card-value">{tags.length}</div>
            </div>
          </div>

          <div>
            <h2 className="section-title">Включающие теги</h2>
            {includeTags.length ? (
              <div className="tags-grid">
                {includeTags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    onModeChange={actions.updateTagMode}
                    onToggleExclude={actions.toggleExclude}
                    onDelete={actions.removeTag}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Нет включающих тегов" subtitle="Добавьте теги или сбросьте настройки по умолчанию" />
            )}
          </div>

          {excludeTags.length ? (
            <div style={{ marginTop: '20px' }}>
              <h2 className="section-title">
                Исключающие теги <span className="badge badge-danger">отклоняют статьи</span>
              </h2>
              <div className="tags-grid">
                {excludeTags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    onModeChange={actions.updateTagMode}
                    onToggleExclude={actions.toggleExclude}
                    onDelete={actions.removeTag}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
