import { useEffect, useState } from 'react';
import { useToast } from '../../../app/providers/ToastProvider';
import { fetchManagedUsers, updateManagedUserRoles } from '../../../entities/auth/api/authApi';
import { APP_ROLES, type AppRole, type ManagedUsersResponse, type RoleManagedUser } from '../../../entities/auth/model/types';
import { getTotalPages } from '../../../shared/lib/pagination/getPaginationPages';

interface AccessViewState {
  page: number;
  limit: number;
  query: string;
  draft: string;
}

const INITIAL_VIEW_STATE: AccessViewState = {
  page: 1,
  limit: 20,
  query: '',
  draft: '',
};

const INITIAL_DATA: ManagedUsersResponse = {
  ok: true,
  total: 0,
  page: 1,
  limit: 20,
  roles: [...APP_ROLES],
  users: [],
};

function normalizeRoles(roles: readonly AppRole[]): AppRole[] {
  return [...roles].sort((left, right) => APP_ROLES.indexOf(left) - APP_ROLES.indexOf(right));
}

function areRolesEqual(left: readonly AppRole[], right: readonly AppRole[]): boolean {
  const leftRoles = normalizeRoles(left);
  const rightRoles = normalizeRoles(right);

  if (leftRoles.length !== rightRoles.length) {
    return false;
  }

  return leftRoles.every((role, index) => role === rightRoles[index]);
}

export function useAccessPage(enabled: boolean) {
  const { pushToast } = useToast();
  const [view, setView] = useState<AccessViewState>(INITIAL_VIEW_STATE);
  const [data, setData] = useState<ManagedUsersResponse>(INITIAL_DATA);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [savingUserId, setSavingUserId] = useState('');
  const [draftRolesByUserId, setDraftRolesByUserId] = useState<Record<string, AppRole[]>>({});

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      setLoading(true);

      try {
        const response = await fetchManagedUsers(view.page, view.limit, view.query);
        if (cancelled) return;

        const totalPages = getTotalPages(response.total, response.limit);
        if (view.page > totalPages) {
          setView((current) => ({ ...current, page: totalPages }));
          return;
        }

        setData(response);
        setDraftRolesByUserId(
          Object.fromEntries(response.users.map((user) => [user.id, normalizeRoles(user.appRoles)])),
        );
        setError('');
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить пользователей');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadKey, view.limit, view.page, view.query]);

  function setDraft(value: string) {
    setView((current) => ({ ...current, draft: value }));
  }

  function submitSearch() {
    setView((current) => ({
      ...current,
      page: 1,
      query: current.draft.trim(),
    }));
  }

  function setPage(page: number) {
    setView((current) => ({ ...current, page: Math.max(1, page) }));
  }

  function setLimit(limit: number) {
    setView((current) => ({ ...current, limit, page: 1 }));
  }

  function toggleRole(userId: string, role: AppRole) {
    setDraftRolesByUserId((current) => {
      const currentRoles = current[userId] ?? [];
      const nextRoles = currentRoles.includes(role)
        ? currentRoles.filter((item) => item !== role)
        : [...currentRoles, role];

      return {
        ...current,
        [userId]: normalizeRoles(nextRoles),
      };
    });
  }

  function getDraftRoles(user: RoleManagedUser): AppRole[] {
    return draftRolesByUserId[user.id] ?? normalizeRoles(user.appRoles);
  }

  function hasChanges(user: RoleManagedUser): boolean {
    return !areRolesEqual(getDraftRoles(user), user.appRoles);
  }

  async function saveRoles(user: RoleManagedUser) {
    const nextRoles = getDraftRoles(user);
    setSavingUserId(user.id);

    try {
      const response = await updateManagedUserRoles(user.id, nextRoles);
      const updatedUser = response.user;

      setData((current) => ({
        ...current,
        users: current.users.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
      }));
      setDraftRolesByUserId((current) => ({
        ...current,
        [updatedUser.id]: normalizeRoles(updatedUser.appRoles),
      }));
      pushToast(`Роли обновлены для ${updatedUser.username}`, 'success');
    } catch (saveError) {
      pushToast(saveError instanceof Error ? saveError.message : 'Не удалось обновить роли', 'error');
    } finally {
      setSavingUserId('');
    }
  }

  return {
    view,
    data,
    loading,
    error,
    savingUserId,
    enabled,
    actions: {
      setDraft,
      submitSearch,
      setPage,
      setLimit,
      refresh: () => setReloadKey((current) => current + 1),
      toggleRole,
      getDraftRoles,
      hasChanges,
      saveRoles,
    },
  };
}
