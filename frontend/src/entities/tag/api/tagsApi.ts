import type { DeletedCountResponse, IdResponse } from '../../../shared/api/http/contracts';
import { requestJson } from '../../../shared/api/http/client';
import type { AddTagPayload, ResetTagsResponse, TagsResponse, UpdateTagPayload, UpsertTagResponse } from '../model/types';

export function fetchTags(): Promise<TagsResponse> {
  return requestJson<TagsResponse>('/tags');
}

export function addTag(payload: AddTagPayload): Promise<UpsertTagResponse> {
  return requestJson<UpsertTagResponse>('/tags', {
    method: 'POST',
    body: payload,
  });
}

export function updateTag(id: number, payload: UpdateTagPayload): Promise<UpsertTagResponse> {
  return requestJson<UpsertTagResponse>(`/tags/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteTag(id: number): Promise<IdResponse<number>> {
  return requestJson<IdResponse<number>>(`/tags/${id}`, {
    method: 'DELETE',
  });
}

export function deleteAllTags(): Promise<DeletedCountResponse> {
  return requestJson<DeletedCountResponse>('/tags', {
    method: 'DELETE',
  });
}

export function resetTags(): Promise<ResetTagsResponse> {
  return requestJson<ResetTagsResponse>('/tags/reset', {
    method: 'POST',
  });
}
