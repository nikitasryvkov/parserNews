export interface VpoHistoryItem {
  id: string;
  title: string;
  createdAt: string;
  rowCount: number;
  sourceFiles: string[];
}

export interface VpoHistoryResponse {
  ok: boolean;
  items: VpoHistoryItem[];
}

export interface UploadVpoResponse {
  ok: boolean;
  sessionId: string;
  files: string[];
  message?: string;
}

export interface DownloadVpoFileResult {
  blob: Blob;
  fileName: string;
}
