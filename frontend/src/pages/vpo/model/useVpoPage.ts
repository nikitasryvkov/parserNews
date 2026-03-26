import { useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import {
  deleteAllVpoHistory,
  deleteVpoHistoryEntry,
  downloadVpoFile,
  fetchVpoHistory,
  uploadVpoFiles,
} from '../../../entities/vpo/api/vpoApi';
import type { VpoHistoryItem } from '../../../entities/vpo/model/types';
import { confirmAction } from '../../../shared/lib/browser/dialogs';
import { downloadBlob } from '../../../shared/lib/files/downloadBlob';
import { usePollingEffect } from '../../../shared/lib/react/usePollingEffect';
import { POLLING_INTERVALS } from '../../../shared/config/constants';

export function useVpoPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<VpoHistoryItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadStatusIsError, setUploadStatusIsError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);

  usePollingEffect(
    async () => {
      try {
        const response = await fetchVpoHistory();
        setItems(response.items);
        setError('');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить историю ВПО');
      } finally {
        setLoading(false);
      }
    },
    POLLING_INTERVALS.vpoHistory,
    [refreshKey],
  );

  async function upload(files: FileList | null) {
    if (!files?.length) {
      pushToast('Выберите один или несколько файлов .xlsx', 'error');
      return false;
    }

    setUploading(true);
    setUploadStatus('Загрузка…');
    setUploadStatusIsError(false);

    try {
      const response = await uploadVpoFiles(files);
      const fileNames = response.files || [];

      setUploadStatus(fileNames.length ? `В очереди: ${fileNames.join(', ')}` : 'Файлы приняты');
      setUploadStatusIsError(false);
      pushToast(response.message || 'Файлы приняты', 'success');
      setRefreshKey((current) => current + 1);

      return true;
    } catch (errorValue) {
      const message = errorValue instanceof Error ? errorValue.message : 'Не удалось загрузить файлы';
      setUploadStatus(message);
      setUploadStatusIsError(true);
      pushToast(message, 'error');

      return false;
    } finally {
      setUploading(false);
    }
  }

  async function download(item: VpoHistoryItem) {
    setDownloadingId(item.id);

    try {
      const { blob, fileName } = await downloadVpoFile(item.id);
      downloadBlob(blob, fileName);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось скачать файл', 'error');
    } finally {
      setDownloadingId('');
    }
  }

  async function remove(item: VpoHistoryItem) {
    if (!confirmAction('Удалить этот объединённый файл?')) return;

    setDeletingId(item.id);

    try {
      await deleteVpoHistoryEntry(item.id);
      pushToast('Файл удалён', 'success');
      setRefreshKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось удалить файл', 'error');
    } finally {
      setDeletingId('');
    }
  }

  async function removeAll() {
    if (!confirmAction('Удалить всю историю объединённых файлов ВПО? Это действие необратимо.')) return;

    setDeletingAll(true);

    try {
      const response = await deleteAllVpoHistory();
      pushToast(`Удалено записей: ${response.deleted}`, 'success');
      setRefreshKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось удалить историю ВПО', 'error');
    } finally {
      setDeletingAll(false);
    }
  }

  return {
    loading,
    error,
    items,
    uploadStatus,
    uploadStatusIsError,
    uploading,
    downloadingId,
    deletingId,
    deletingAll,
    actions: {
      refresh: () => setRefreshKey((current) => current + 1),
      upload,
      download,
      remove,
      removeAll,
    },
  };
}
