import { useEffect, useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import {
  deleteAllArticles,
  deleteArticle,
  fetchArticles,
  updateArticleCategory,
} from '../../../entities/article/api/articlesApi';
import type { Article, ArticlesResponse } from '../../../entities/article/model/types';
import { confirmAction } from '../../../shared/lib/browser/dialogs';
import { getTotalPages } from '../../../shared/lib/pagination/getPaginationPages';

interface ArticlesViewState {
  page: number;
  limit: number;
  search: string;
  source: string;
  category: string;
  draftSearch: string;
  draftSource: string;
  draftCategory: string;
  editMode: boolean;
}

const INITIAL_VIEW_STATE: ArticlesViewState = {
  page: 1,
  limit: 20,
  search: '',
  source: '',
  category: '',
  draftSearch: '',
  draftSource: '',
  draftCategory: '',
  editMode: false,
};

const INITIAL_DATA: ArticlesResponse = {
  total: 0,
  page: 1,
  limit: 20,
  articles: [],
};

function normalizeCategory(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function buildCategoryDrafts(articles: Article[]): Record<string, string> {
  return Object.fromEntries(articles.map((article) => [String(article.id), normalizeCategory(article.category)]));
}

export function useArticlesPage() {
  const { pushToast } = useToast();
  const [view, setView] = useState<ArticlesViewState>(INITIAL_VIEW_STATE);
  const [data, setData] = useState<ArticlesResponse>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [draftCategoriesById, setDraftCategoriesById] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadArticles() {
      setLoading(true);

      try {
        const response = await fetchArticles({
          page: view.page,
          limit: view.limit,
          search: view.search,
          source: view.source,
          category: view.category,
        });
        if (cancelled) return;

        const totalPages = getTotalPages(response.total, response.limit);
        if (view.page > totalPages) {
          setView((current) => ({ ...current, page: totalPages }));
          return;
        }

        setData(response);
        setDraftCategoriesById(buildCategoryDrafts(response.articles));
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
  }, [reloadKey, view.limit, view.page, view.search, view.source, view.category]);

  function setDraftSearch(value: string) {
    setView((current) => ({ ...current, draftSearch: value }));
  }

  function setDraftSource(value: string) {
    setView((current) => ({ ...current, draftSource: value }));
  }

  function setDraftCategory(value: string) {
    setView((current) => ({ ...current, draftCategory: value }));
  }

  function submitFilters() {
    setView((current) => ({
      ...current,
      search: current.draftSearch.trim(),
      source: current.draftSource.trim(),
      category: current.draftCategory.trim(),
      page: 1,
    }));
  }

  function resetFilters() {
    setView((current) => ({
      ...current,
      page: 1,
      search: '',
      source: '',
      category: '',
      draftSearch: '',
      draftSource: '',
      draftCategory: '',
    }));
  }

  function setPage(page: number) {
    setView((current) => ({ ...current, page: Math.max(1, page) }));
  }

  function setLimit(limit: number) {
    setView((current) => ({ ...current, limit, page: 1 }));
  }

  function toggleEditMode() {
    setView((current) => ({ ...current, editMode: !current.editMode }));

    if (view.editMode) {
      setDraftCategoriesById(buildCategoryDrafts(data.articles));
    }
  }

  function setArticleCategory(id: number, value: string) {
    setDraftCategoriesById((current) => ({
      ...current,
      [String(id)]: value,
    }));
  }

  function getDraftCategory(article: Article): string {
    const key = String(article.id);
    return draftCategoriesById[key] ?? normalizeCategory(article.category);
  }

  function hasPendingCategoryChange(article: Article): boolean {
    return normalizeCategory(getDraftCategory(article)) !== normalizeCategory(article.category);
  }

  function resetArticleCategory(article: Article) {
    setDraftCategoriesById((current) => ({
      ...current,
      [String(article.id)]: normalizeCategory(article.category),
    }));
  }

  async function saveArticleCategory(article: Article) {
    const nextCategory = normalizeCategory(getDraftCategory(article));
    setSavingId(article.id);

    try {
      const response = await updateArticleCategory(article.id, nextCategory || null);
      const updatedArticle = response.article;

      setData((current) => ({
        ...current,
        articles: current.articles.map((item) => (item.id === updatedArticle.id ? updatedArticle : item)),
      }));
      setDraftCategoriesById((current) => ({
        ...current,
        [String(updatedArticle.id)]: normalizeCategory(updatedArticle.category),
      }));
      pushToast('Категория статьи обновлена', 'success');
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось обновить категорию статьи', 'error');
    } finally {
      setSavingId(null);
    }
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
    savingId,
    actions: {
      setDraftSearch,
      setDraftSource,
      setDraftCategory,
      submitFilters,
      resetFilters,
      setPage,
      setLimit,
      toggleEditMode,
      setArticleCategory,
      getDraftCategory,
      hasPendingCategoryChange,
      resetArticleCategory,
      saveArticleCategory,
      removeArticle,
      removeAllArticles,
    },
  };
}
