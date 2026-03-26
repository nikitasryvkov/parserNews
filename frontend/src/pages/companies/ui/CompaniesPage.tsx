import { useAuth } from '../../../features/auth/model/useAuth';
import { EmptyState } from '../../../shared/ui/empty-state/EmptyState';
import { ErrorCard } from '../../../shared/ui/error-card/ErrorCard';
import { LoadingState } from '../../../shared/ui/loading-state/LoadingState';
import { PageSizeSelect } from '../../../shared/ui/page-size-select/PageSizeSelect';
import { Pagination } from '../../../shared/ui/pagination/Pagination';
import { useCompaniesPage } from '../model/useCompaniesPage';

function getCompaniesSubtitle(pool: 'medtech' | 'edtech'): string {
  return pool === 'edtech'
    ? 'Рейтинг EdTech — edtechs.ru (онлайн-образование)'
    : 'Рейтинг Smart Ranking — медицинские технологии (MedTech)';
}

function getDynamicsClass(value: string | null): string {
  if (!value) return 'cell-dim';

  const lowered = value.toLowerCase();
  if (value.includes('+') || lowered.includes('рост')) return 'cell-positive';
  if (value.includes('-') || lowered.includes('паден')) return 'cell-negative';

  return '';
}

export function CompaniesPage() {
  const auth = useAuth();
  const canDeleteCompanies = auth.hasPermission('companies.delete');
  const { view, data, loading, error, deletingId, deletingAll, actions } = useCompaniesPage();

  const emptySubtitle = view.query
    ? 'Попробуйте изменить поисковый запрос'
    : view.pool === 'edtech'
      ? 'Запустите сбор с главной страницы кнопкой EdTech'
      : 'Запустите сбор с главной страницы кнопкой MedTech';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Компании</h1>
          <p className="page-subtitle">{getCompaniesSubtitle(view.pool)}</p>
          <div className="btn-group companies-pool-tabs" role="tablist" aria-label="Таблица рейтинга">
            <button
              type="button"
              role="tab"
              className={`btn ${view.pool === 'medtech' ? 'btn-primary' : 'btn-secondary'}`}
              aria-selected={view.pool === 'medtech'}
              onClick={() => actions.setPool('medtech')}
            >
              MedTech
            </button>
            <button
              type="button"
              role="tab"
              className={`btn ${view.pool === 'edtech' ? 'btn-primary' : 'btn-secondary'}`}
              aria-selected={view.pool === 'edtech'}
              onClick={() => actions.setPool('edtech')}
            >
              EdTech
            </button>
          </div>
        </div>
        {canDeleteCompanies ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={actions.removeAllCompanies} disabled={deletingAll}>
            {deletingAll ? 'Удаление…' : 'Удалить все в этой таблице'}
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
          placeholder="Поиск по названию, сегменту, CEO..."
          value={view.draft}
          onChange={(event) => actions.setDraft(event.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Найти
        </button>
        <PageSizeSelect id="companies-page-size" value={view.limit} onChange={actions.setLimit} />
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorCard message={error} />
      ) : data.companies.length === 0 ? (
        <EmptyState title="Компании не найдены" subtitle={emptySubtitle} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Поз.</th>
                <th>Компания</th>
                <th>CEO</th>
                <th>Сегмент</th>
                <th>Выручка 2024 Q2</th>
                <th>Выручка 2025 Q3</th>
                <th>Динамика</th>
                <th style={{ width: '50px' }} />
              </tr>
            </thead>
            <tbody>
              {data.companies.map((company) => (
                <tr key={company.id}>
                  <td className="cell-mono" style={{ fontWeight: 700, textAlign: 'center' }}>
                    {company.position}
                  </td>
                  <td className="cell-title">
                    {company.company_url ? (
                      <a href={company.company_url} target="_blank" rel="noreferrer">
                        {company.company_name}
                      </a>
                    ) : (
                      company.company_name
                    )}
                  </td>
                  <td>{company.ceo || <span className="cell-dim">—</span>}</td>
                  <td>
                    {company.segment ? (
                      <span className="badge badge-muted">{company.segment}</span>
                    ) : (
                      <span className="cell-dim">—</span>
                    )}
                  </td>
                  <td className="cell-mono">{company.revenue_2024_q2 || '—'}</td>
                  <td className="cell-mono">{company.revenue_2025_q3 || '—'}</td>
                  <td className={getDynamicsClass(company.dynamics)}>{company.dynamics || '—'}</td>
                  <td>
                    {canDeleteCompanies ? (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Удалить"
                        onClick={() => actions.removeCompany(company.id)}
                        disabled={deletingId === company.id}
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
