import type { DeletedCountResponse, IdResponse } from '../../../shared/api/http/contracts';
import { requestJson } from '../../../shared/api/http/client';
import type { ArticlesResponse } from '../model/types';

export function fetchArticles(page: number, limit: number, search: string): Promise<ArticlesResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    params.set('search', search);
  }

  return requestJson<ArticlesResponse>(`/articles?${params.toString()}`);
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
