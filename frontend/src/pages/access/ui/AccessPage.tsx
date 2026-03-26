import type { AppRole, RoleDescriptor, RoleManagedUser } from '../../../entities/auth/model/types';
import { useAuth } from '../../../features/auth/model/useAuth';
import { EmptyState } from '../../../shared/ui/empty-state/EmptyState';
import { ErrorCard } from '../../../shared/ui/error-card/ErrorCard';
import { LoadingState } from '../../../shared/ui/loading-state/LoadingState';
import { PageSizeSelect } from '../../../shared/ui/page-size-select/PageSizeSelect';
import { Pagination } from '../../../shared/ui/pagination/Pagination';
import { useAccessPage } from '../model/useAccessPage';

function findRoleDescriptor(role: AppRole, descriptors: RoleDescriptor[]): RoleDescriptor | undefined {
  return descriptors.find((descriptor) => descriptor.name === role);
}

function getFullName(user: RoleManagedUser): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.username;
}

export function AccessPage() {
  const auth = useAuth();
  const roleManagementEnabled = Boolean(auth.config?.roleManagementEnabled);
  const roleDescriptors = auth.config?.roles ?? [];
  const { view, data, loading, error, savingUserId, actions } = useAccessPage(roleManagementEnabled);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Управление доступом</h1>
          <p className="page-subtitle">Назначение ролей приложения пользователям Keycloak</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={actions.refresh} disabled={!roleManagementEnabled}>
          Обновить
        </button>
      </div>

      <div className="cards access-role-cards">
        {roleDescriptors.map((role) => (
          <section key={role.name} className="card">
            <div className="card-label">{role.label}</div>
            <p className="access-role-description">{role.description}</p>
            <div className="permission-grid">
              {role.permissions.map((permission) => (
                <code key={`${role.name}-${permission}`} className="permission-chip">
                  {permission}
                </code>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!roleManagementEnabled ? (
        <div className="card auth-card">
          <div className="card-label">Keycloak Admin API</div>
          <h2 className="page-title">Управление ролями не настроено</h2>
          <p className="auth-card-text">
            Для выдачи ролей укажите <code>KEYCLOAK_ADMIN_CLIENT_ID</code> и <code>KEYCLOAK_ADMIN_CLIENT_SECRET</code> на сервере.
          </p>
        </div>
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorCard message={error} />
      ) : data.users.length === 0 ? (
        <EmptyState
          title="Пользователи не найдены"
          subtitle={view.query ? 'Попробуйте изменить поисковый запрос' : 'В Keycloak пока нет пользователей под этот фильтр'}
        />
      ) : (
        <>
          <form
            className="search-bar"
            onSubmit={(event) => {
              event.preventDefault();
              actions.submitSearch();
            }}
          >
            <input
              className="search-input search-bar-grow"
              type="text"
              placeholder="Поиск по логину, email или имени..."
              value={view.draft}
              onChange={(event) => actions.setDraft(event.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Найти
            </button>
            <PageSizeSelect id="access-page-size" value={view.limit} onChange={actions.setLimit} />
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Email</th>
                  <th>Статус</th>
                  <th>Роли</th>
                  <th>Realm roles</th>
                  <th style={{ width: '160px' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => {
                  const draftRoles = actions.getDraftRoles(user);

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="cell-title">{getFullName(user)}</div>
                        <div className="cell-summary cell-mono">{user.username}</div>
                      </td>
                      <td>{user.email || <span className="cell-dim">—</span>}</td>
                      <td>
                        <span className={`badge ${user.enabled ? 'badge-success' : 'badge-danger'}`}>
                          {user.enabled ? 'active' : 'disabled'}
                        </span>
                      </td>
                      <td>
                        <div className="access-role-list">
                          {data.roles.map((role) => {
                            const descriptor = findRoleDescriptor(role, roleDescriptors);

                            return (
                              <label key={`${user.id}-${role}`} className="access-role-toggle" title={descriptor?.description || role}>
                                <input
                                  type="checkbox"
                                  checked={draftRoles.includes(role)}
                                  onChange={() => actions.toggleRole(user.id, role)}
                                />
                                <span>{descriptor?.label || role}</span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td className="cell-dim">
                        <div className="role-badges">
                          {user.realmRoles.length
                            ? user.realmRoles.map((role) => (
                                <span key={`${user.id}-${role}`} className="badge badge-muted">
                                  {role}
                                </span>
                              ))
                            : '—'}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => void actions.saveRoles(user)}
                          disabled={savingUserId === user.id || !actions.hasChanges(user)}
                        >
                          {savingUserId === user.id ? 'Сохранение…' : 'Сохранить'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={actions.setPage} />
          </div>
        </>
      )}
    </>
  );
}
