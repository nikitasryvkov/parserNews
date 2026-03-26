export type TagMode = 'phrase' | 'words' | 'prefix' | 'regex';

export interface TagItem {
  id: number;
  tag: string;
  mode: TagMode;
  exclude: boolean;
}

export interface TagsResponse {
  total: number;
  tags: TagItem[];
}

export interface UpsertTagResponse {
  ok: boolean;
  tag: TagItem;
}

export interface AddTagPayload {
  tag: string;
  mode: TagMode;
  exclude: boolean;
}

export interface UpdateTagPayload {
  tag?: string;
  mode?: TagMode;
  exclude?: boolean;
}

export interface ResetTagsResponse {
  ok: boolean;
  count: number;
}
