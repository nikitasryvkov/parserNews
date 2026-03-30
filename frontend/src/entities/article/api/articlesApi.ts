import type { DeletedCountResponse, IdResponse } from '../../../shared/api/http/contracts';
import { requestJson } from '../../../shared/api/http/client';
import type { ArticlesQuery, ArticlesResponse, UpdateArticleResponse } from '../model/types';

export function fetchArticles(query: ArticlesQuery): Promise<ArticlesResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });

  if (query.search) {
    params.set('search', query.search);
  }

  if (query.source) {
    params.set('source', query.source);
  }

  if (query.category) {
    params.set('category', query.category);
  }

  return requestJson<ArticlesResponse>(`/articles?${params.toString()}`);
}

export function updateArticleCategory(id: number, category: string | null): Promise<UpdateArticleResponse> {
  return requestJson<UpdateArticleResponse>(`/articles/${id}`, {
    method: 'PATCH',
    body: { category },
  });
}

export function deleteAllArticles(): Promise<DeletedCountResponse> {
  return requestJson<DeletedCountResponse>('/articles', {
    method: 'DELETE',
  });
}

export function deleteArticle(id: number): Promise<IdResponse<number>> {
  return requestJson<IdResponse<number>>(`/articles/${id}`, {
    method: 'DELETE',
  });
}
