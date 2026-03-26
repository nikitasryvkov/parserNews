export interface OkResponse {
  ok: boolean;
}

export interface IdResponse<T = string | number> extends OkResponse {
  id: T;
}

export interface DeletedCountResponse extends OkResponse {
  deleted: number;
}
