import type { DeletedCountResponse, IdResponse } from '../../../shared/api/http/contracts';
import { requestBlob, requestJson } from '../../../shared/api/http/client';
import type { DownloadVpoFileResult, UploadVpoResponse, VpoHistoryResponse } from '../model/types';

export function fetchVpoHistory(): Promise<VpoHistoryResponse> {
  return requestJson<VpoHistoryResponse>('/vpo/history');
}

export async function uploadVpoFiles(files: FileList): Promise<UploadVpoResponse> {
  const formData = new FormData();

  for (let index = 0; index < files.length; index += 1) {
    const file = files.item(index);
    if (file) {
      formData.append('files', file);
    }
  }

  return requestJson<UploadVpoResponse>('/upload/vpo-svod', {
    method: 'POST',
    body: formData,
  });
}

export async function downloadVpoFile(id: string): Promise<DownloadVpoFileResult> {
  const { response, blob } = await requestBlob(`/vpo/history/${encodeURIComponent(id)}/file`);
  const contentDisposition = response.headers.get('content-disposition') || '';
  const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

  return {
    blob,
    fileName: fileNameMatch?.[1] || `vpo-${id}.xlsx`,
  };
}

export function deleteVpoHistoryEntry(id: string): Promise<IdResponse<string>> {
  return requestJson<IdResponse<string>>(`/vpo/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function deleteAllVpoHistory(): Promise<DeletedCountResponse> {
  return requestJson<DeletedCountResponse>('/vpo/history', {
    method: 'DELETE',
  });
}
