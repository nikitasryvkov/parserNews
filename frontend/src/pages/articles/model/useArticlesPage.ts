import { useEffect, useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import { deleteAllArticles, deleteArticle, fetchArticles } from '../../../entities/article/api/articlesApi';
import type { ArticlesResponse } from '../../../entities/article/model/types';
import { confirmAction } from '../../../shared/lib/browser/dialogs';
import { getTotalPages } from '../../../shared/lib/pagination/getPaginationPages';

interface ArticlesViewState {
  page: number;
  limit: number;
  query: string;
  draft: string;
}

const INITIAL_VIEW_STATE: ArticlesViewState = {
  page: 1,
  limit: 20,
  query: '',
  draft: '',
};

const INITIAL_DATA: ArticlesResponse = {
  total: 0,
  page: 1,
  limit: 20,
  articles: [],
};

export function useArticlesPage() {
  const { pushToast } = useToast();
  const [view, setView] = useState<ArticlesViewState>(INITIAL_VIEW_STATE);
  const [data, setData] = useState<ArticlesResponse>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadArticles() {
      setLoading(true);

      try {
        const response = await fetchArticles(view.page, view.limit, view.query);
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
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить статьи');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadArticles();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, view.limit, view.page, view.query]);

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

  async function removeArticle(id: number) {
    setDeletingId(id);

    try {
      await deleteArticle(id);
      pushToast('Статья удалена', 'success');
      setReloadKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось удалить статью', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  async function removeAllArticles() {
    if (!confirmAction('Удалить все статьи? Это действие необратимо.')) return;

    setDeletingAll(true);

    try {
      const response = await deleteAllArticles();
      pushToast(`Удалено статей: ${response.deleted}`, 'success');
      setView((current) => ({ ...current, page: 1 }));
      setReloadKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось удалить статьи', 'error');
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
      removeArticle,
      removeAllArticles,
    },
  };
}
