import { useEffect, useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import { deleteAllCompanies, deleteCompany, fetchCompanies } from '../../../entities/company/api/companiesApi';
import type { CompaniesPool, CompaniesResponse } from '../../../entities/company/model/types';
import { confirmAction } from '../../../shared/lib/browser/dialogs';
import { getTotalPages } from '../../../shared/lib/pagination/getPaginationPages';

interface CompaniesViewState {
  page: number;
  limit: number;
  query: string;
  draft: string;
  pool: CompaniesPool;
}

const INITIAL_VIEW_STATE: CompaniesViewState = {
  page: 1,
  limit: 20,
  query: '',
  draft: '',
  pool: 'medtech',
};

const INITIAL_DATA: CompaniesResponse = {
  total: 0,
  page: 1,
  limit: 20,
  companies: [],
};

export function useCompaniesPage() {
  const { pushToast } = useToast();
  const [view, setView] = useState<CompaniesViewState>(INITIAL_VIEW_STATE);
  const [data, setData] = useState<CompaniesResponse>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      setLoading(true);

      try {
        const response = await fetchCompanies(view.page, view.limit, view.query, view.pool);
        if (cancelled) return;

        const totalPages = getTotalPages(response.total, response.limit);
        if (view.page > totalPages) {
          setView((current) => ({ ...current, page: totalPages }));
          return;
        }

        setData(response);
        setError('');
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить компании');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCompanies();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, view.limit, view.page, view.pool, view.query]);

  function setDraft(value: string) {
    setView((current) => ({ ...current, draft: value }));
  }

  function submitSearch() {
    setView((current) => ({
      ...current,
      query: current.draft.trim(),
      page: 1,
    }));
  }

  function setPage(page: number) {
    setView((current) => ({ ...current, page: Math.max(1, page) }));
  }

  function setLimit(limit: number) {
    setView((current) => ({ ...current, limit, page: 1 }));
  }

  function setPool(pool: CompaniesPool) {
    setView((current) => ({
      ...current,
      pool,
      page: 1,
    }));
  }

  async function removeCompany(id: number) {
    setDeletingId(id);

    try {
      await deleteCompany(id, view.pool);
      pushToast('Компания удалена', 'success');
      setReloadKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось удалить компанию', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  async function removeAllCompanies() {
    const poolLabel = view.pool === 'edtech' ? 'EdTech' : 'MedTech';
    if (!confirmAction(`Удалить все компании в таблице «${poolLabel}»? Это действие необратимо.`)) return;

    setDeletingAll(true);

    try {
      const response = await deleteAllCompanies(view.pool);
      pushToast(`Удалено компаний: ${response.deleted}`, 'success');
      setView((current) => ({ ...current, page: 1 }));
      setReloadKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось удалить компании', 'error');
    } finally {
      setDeletingAll(false);
    }
  }

  return {
    view,
    data,
    loading,
    error,
    deletingId,
    deletingAll,
    actions: {
      setDraft,
      submitSearch,
      setPage,
      setLimit,
      setPool,
      removeCompany,
      removeAllCompanies,
    },
  };
}
