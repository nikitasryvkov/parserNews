import { useAuth } from '../../../features/auth/model/useAuth';
import { formatDate, formatDateTime } from '../../../shared/lib/date/format';
import { EmptyState } from '../../../shared/ui/empty-state/EmptyState';
import { ErrorCard } from '../../../shared/ui/error-card/ErrorCard';
import { LoadingState } from '../../../shared/ui/loading-state/LoadingState';
import { PageSizeSelect } from '../../../shared/ui/page-size-select/PageSizeSelect';
import { Pagination } from '../../../shared/ui/pagination/Pagination';
import { useArticlesPage } from '../model/useArticlesPage';

export function ArticlesPage() {
  const auth = useAuth();
  const canDeleteArticles = auth.hasPermission('articles.delete');
  const { view, data, loading, error, deletingId, deletingAll, actions } = useArticlesPage();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Статьи</h1>
          <p className="page-subtitle">Спаршенные материалы из подключенных источников</p>
        </div>
        {canDeleteArticles ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={actions.removeAllArticles} disabled={deletingAll}>
            {deletingAll ? 'Удаление…' : 'Удалить все статьи'}
          </button>
        ) : null}
      </div>

      <form
        className="search-bar"
        onSubmit={(event) => {
          event.preventDefault();
          actions.submitSearch();
        }}
      >
        <input
          className="search-input search-bar-grow"
          type="text"
          placeholder="Поиск по заголовку, источнику, категории..."
          value={view.draft}
          onChange={(event) => actions.setDraft(event.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Найти
        </button>
        <PageSizeSelect id="articles-page-size" value={view.limit} onChange={actions.setLimit} />
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorCard message={error} />
      ) : data.articles.length === 0 ? (
        <EmptyState
          title="Статьи не найдены"
          subtitle={view.query ? 'Попробуйте изменить поисковый запрос' : 'Запустите сбор данных с главной страницы'}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Заголовок</th>
                <th>Источник</th>
                <th>Категория</th>
                <th>Опубликовано</th>
                <th>Добавлено</th>
                <th style={{ width: '50px' }} />
              </tr>
            </thead>
            <tbody>
              {data.articles.map((article) => (
                <tr key={article.id}>
                  <td className="cell-dim cell-mono">{article.id}</td>
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
                  <td className="cell-dim">{article.category || '—'}</td>
                  <td className="cell-dim" style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(article.published_at)}
                  </td>
                  <td className="cell-dim" style={{ whiteSpace: 'nowrap' }}>
                    {formatDateTime(article.created_at)}
                  </td>
                  <td>
                    {canDeleteArticles ? (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Удалить"
                        onClick={() => actions.removeArticle(article.id)}
                        disabled={deletingId === article.id}
                      >
                        ×
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={actions.setPage} />
        </div>
      )}
    </>
  );
}
