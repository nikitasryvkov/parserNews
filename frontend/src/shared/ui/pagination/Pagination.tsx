import { useEffect, useState } from 'react';
import { getPaginationPages, getTotalPages } from '../../lib/pagination/getPaginationPages';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const totalPages = getTotalPages(total, limit);
  const [gotoValue, setGotoValue] = useState(String(page));

  useEffect(() => {
    setGotoValue(String(page));
  }, [page]);

  if (totalPages <= 1 && total <= limit) return null;

  function submitGoto() {
    const parsed = Number.parseInt(gotoValue, 10);
    if (Number.isNaN(parsed)) return;

    onPageChange(Math.max(1, Math.min(totalPages, parsed)));
  }

  return (
    <div className="pagination">
      <span className="pagination-summary">
        Страница {page} из {totalPages} ({total} записей)
      </span>
      <div className="pagination-controls">
        <div className="pagination-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            ← Назад
          </button>
          <div className="pagination-pages" role="group" aria-label="Номера страниц">
            {getPaginationPages(page, totalPages).map((item) =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  className={`btn btn-secondary btn-sm pagination-num${item === page ? ' is-active' : ''}`}
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? 'page' : undefined}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="pagination-gap" aria-hidden="true">
                  …
                </span>
              ),
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Вперёд →
          </button>
        </div>
        <div className="pagination-goto">
          <label className="pagination-goto-label">
            <span className="pagination-goto-text">На стр.</span>
            <input
              type="number"
              className="search-input pagination-goto-input"
              min="1"
              max={totalPages}
              value={gotoValue}
              onChange={(event) => setGotoValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitGoto();
              }}
            />
          </label>
          <button type="button" className="btn btn-primary btn-sm" onClick={submitGoto}>
            Перейти
          </button>
        </div>
      </div>
    </div>
  );
}
