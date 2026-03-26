import { useEffect, useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import { addTag, deleteAllTags, deleteTag, fetchTags, resetTags, updateTag } from '../../../entities/tag/api/tagsApi';
import { TAG_MODE_LABELS } from '../../../entities/tag/model/constants';
import type { TagItem, TagMode } from '../../../entities/tag/model/types';
import { confirmAction } from '../../../shared/lib/browser/dialogs';

export function useTagsPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tags, setTags] = useState<TagItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tagValue, setTagValue] = useState('');
  const [mode, setMode] = useState<TagMode>('phrase');
  const [exclude, setExclude] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      setLoading(true);

      try {
        const response = await fetchTags();
        if (cancelled) return;

        setTags(response.tags);
        setError('');
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить теги');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function submitTag() {
    const normalizedValue = tagValue.trim();
    if (!normalizedValue) {
      pushToast('Введите тег', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await addTag({
        tag: normalizedValue,
        mode,
        exclude,
      });

      setTagValue('');
      setExclude(false);
      pushToast('Тег добавлен', 'success');
      setRefreshKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось добавить тег', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateTagMode(tag: TagItem, nextMode: TagMode) {
    try {
      await updateTag(tag.id, { mode: nextMode });
      pushToast(`Режим изменён: ${TAG_MODE_LABELS[nextMode]}`, 'success');
      setRefreshKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось обновить тег', 'error');
    }
  }

  async function toggleExclude(tag: TagItem) {
    try {
      await updateTag(tag.id, { exclude: !tag.exclude });
      pushToast(tag.exclude ? 'Тег теперь включающий' : 'Тег теперь исключающий', 'success');
      setRefreshKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось обновить тег', 'error');
    }
  }

  async function removeTag(tag: TagItem) {
    try {
      await deleteTag(tag.id);
      pushToast('Тег удалён', 'success');
      setRefreshKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось удалить тег', 'error');
    }
  }

  async function removeAllTags() {
    if (!confirmAction('Удалить все теги фильтра?')) return;

    try {
      const response = await deleteAllTags();
      pushToast(`Удалено тегов: ${response.deleted}`, 'success');
      setRefreshKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось удалить теги', 'error');
    }
  }

  async function restoreDefaultTags() {
    if (!confirmAction('Сбросить теги к значениям по умолчанию?')) return;

    try {
      const response = await resetTags();
      pushToast(`Восстановлено тегов: ${response.count}`, 'success');
      setRefreshKey((current) => current + 1);
    } catch (errorValue) {
      pushToast(errorValue instanceof Error ? errorValue.message : 'Не удалось сбросить теги', 'error');
    }
  }

  return {
    loading,
    error,
    tags,
    form: {
      value: tagValue,
      mode,
      exclude,
      submitting,
    },
    actions: {
      setTagValue,
      setMode,
      setExclude,
      submitTag,
      updateTagMode,
      toggleExclude,
      removeTag,
      removeAllTags,
      restoreDefaultTags,
    },
  };
}
