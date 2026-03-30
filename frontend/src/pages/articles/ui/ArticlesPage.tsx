import { useAuth } from '../../../features/auth/model/useAuth';
import { formatDate } from '../../../shared/lib/date/format';
import { EmptyState } from '../../../shared/ui/empty-state/EmptyState';
import { ErrorCard } from '../../../shared/ui/error-card/ErrorCard';
import { LoadingState } from '../../../shared/ui/loading-state/LoadingState';
import { PageSizeSelect } from '../../../shared/ui/page-size-select/PageSizeSelect';
import { Pagination } from '../../../shared/ui/pagination/Pagination';
import { useArticlesPage } from '../model/useArticlesPage';

function getUniqueValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort((left, right) =>
    left.localeCompare(right, 'ru-RU'),
  );
}

export function ArticlesPage() {
  const auth = useAuth();
  const canEditArticles = auth.hasPermission('articles.manage');
  const canDeleteArticles = auth.hasPermission('articles.delete');
  const canUseEditMode = canEditArticles || canDeleteArticles;
  const { view, data, loading, error, deletingId, deletingAll, savingId, actions } = useArticlesPage();
  const sourceOptions = getUniqueValues(data.articles.map((article) => article.source));
  const categoryOptions = getUniqueValues(data.articles.map((article) => article.category));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Статьи</h1>
          <p className="page-subtitle">Спаршенные материалы из подключенных источников</p>
          {view.editMode ? (
            <p className="auth-card-note article-editor-note">Режим редактирования включён: можно менять категорию и удалять статьи.</p>
          ) : null}
        </div>
        <div className="btn-group">
          {canUseEditMode ? (
            <button type="button" className={`btn ${view.editMode ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={actions.toggleEditMode}>
              {view.editMode ? 'Готово' : 'Редактировать'}
            </button>
          ) : null}
          {canDeleteArticles && view.editMode ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={actions.removeAllArticles} disabled={deletingAll}>
              {deletingAll ? 'Удаление…' : 'Удалить все статьи'}
            </button>
          ) : null}
        </div>
      </div>

      <form
        className="search-bar"
        onSubmit={(event) => {
          event.preventDefault();
          actions.submitFilters();
        }}
      >
        <input
          className="search-input article-filter-input article-filter-input-wide"
          type="text"
          placeholder="Поиск по названию, описанию, источнику..."
          value={view.draftSearch}
          onChange={(event) => actions.setDraftSearch(event.target.value)}
        />
        <input
          className="search-input article-filter-input"
          type="text"
          placeholder="Источник"
          list="article-source-options"
          value={view.draftSource}
          onChange={(event) => actions.setDraftSource(event.target.value)}
        />
        <input
          className="search-input article-filter-input"
          type="text"
          placeholder="Категория"
          list="article-category-options"
          value={view.draftCategory}
          onChange={(event) => actions.setDraftCategory(event.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Применить
        </button>
        <button type="button" className="btn btn-secondary" onClick={actions.resetFilters}>
          Сбросить
        </button>
        <PageSizeSelect id="articles-page-size" value={view.limit} onChange={actions.setLimit} />
      </form>

      <datalist id="article-source-options">
        {sourceOptions.map((source) => (
          <option key={source} value={source} />
        ))}
      </datalist>
      <datalist id="article-category-options">
        {categoryOptions.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorCard message={error} />
      ) : data.articles.length === 0 ? (
        <EmptyState
          title="Статьи не найдены"
          subtitle={view.search || view.source || view.category ? 'Попробуйте ослабить фильтры или сбросить поиск' : 'Запустите сбор данных с главной страницы'}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Источник</th>
                <th>Категория</th>
                <th>Опубликовано</th>
                {view.editMode ? <th className="table-actions-head">Действия</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.articles.map((article) => {
                const draftCategory = actions.getDraftCategory(article);
                const categoryChanged = actions.hasPendingCategoryChange(article);

                return (
                  <tr key={article.id}>
                    <td className="cell-title">
                      {article.source_url ? (
                        <a href={article.source_url} target="_blank" rel="noreferrer">
                          {article.title}
                        </a>
                      ) : (
                        article.title
                      )}
                      {article.summary ? <div className="cell-summary">{article.summary}</div> : null}
                    </td>
                    <td>
                      <span className="badge badge-info">{article.source}</span>
                    </td>
                    <td className="cell-dim">
                      {view.editMode && canEditArticles ? (
                        <div className="article-category-editor">
                          <input
                            type="text"
                            className="search-input article-category-input"
                            list="article-category-options"
                            value={draftCategory}
                            onChange={(event) => actions.setArticleCategory(article.id, event.target.value)}
                            placeholder="Без категории"
                          />
                        </div>
                      ) : (
                        article.category || '—'
                      )}
                    </td>
                    <td className="cell-dim article-published-cell">{formatDate(article.published_at)}</td>
                    {view.editMode ? (
                      <td className="table-actions-cell">
                        <div className="article-row-actions">
                          {canEditArticles ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => void actions.saveArticleCategory(article)}
                                disabled={!categoryChanged || savingId === article.id}
                              >
                                {savingId === article.id ? 'Сохранение…' : 'Сохранить'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => actions.resetArticleCategory(article)}
                                disabled={!categoryChanged || savingId === article.id}
                              >
                                Сбросить
                              </button>
                            </>
                          ) : null}
                          {canDeleteArticles ? (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => void actions.removeArticle(article.id)}
                              disabled={deletingId === article.id}
                            >
                              {deletingId === article.id ? 'Удаление…' : 'Удалить'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={actions.setPage} />
        </div>
      )}
    </>
  );
}
