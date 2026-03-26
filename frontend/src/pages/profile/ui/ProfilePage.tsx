import { useAuth } from '../../../features/auth/model/useAuth';

function renderValue(value: string | null | undefined): string {
  return value?.trim() || '—';
}

export function ProfilePage() {
  const auth = useAuth();
  const user = auth.user;

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Личный кабинет</h1>
          <p className="page-subtitle">Профиль пользователя, роли и разрешения текущей сессии</p>
        </div>
        <div className="btn-group">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void auth.refreshProfile()}>
            Обновить профиль
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void auth.logout()}>
            Выйти
          </button>
        </div>
      </div>

      <div className="profile-grid">
        <section className="card profile-section">
          <div className="card-label">Пользователь</div>
          <div className="profile-identity">{user.displayName}</div>
          <div className="profile-meta-grid">
            <div>
              <span className="profile-meta-label">Провайдер</span>
              <div className="badge badge-info">{auth.provider === 'keycloak' ? 'Keycloak' : 'API key'}</div>
            </div>
            <div>
              <span className="profile-meta-label">Логин</span>
              <div>{user.username}</div>
            </div>
            <div>
              <span className="profile-meta-label">Email</span>
              <div>{renderValue(user.email)}</div>
            </div>
            <div>
              <span className="profile-meta-label">Имя</span>
              <div>{renderValue(user.firstName)}</div>
            </div>
            <div>
              <span className="profile-meta-label">Фамилия</span>
              <div>{renderValue(user.lastName)}</div>
            </div>
            <div>
              <span className="profile-meta-label">ID</span>
              <div className="cell-mono">{user.id}</div>
            </div>
          </div>
        </section>

        <section className="card profile-section">
          <div className="card-label">Роли приложения</div>
          {user.appRoles.length ? (
            <div className="role-badges">
              {user.appRoles.map((role) => (
                <span key={role} className="badge badge-info">
                  {role}
                </span>
              ))}
            </div>
          ) : (
            <p className="auth-card-note">Приложенческие роли не назначены.</p>
          )}

          <div className="profile-subsection">
            <div className="profile-meta-label">Realm roles</div>
            <div className="role-badges">
              {user.realmRoles.length ? user.realmRoles.map((role) => <span key={role} className="badge badge-muted">{role}</span>) : '—'}
            </div>
          </div>

          <div className="profile-subsection">
            <div className="profile-meta-label">Client roles</div>
            <div className="role-badges">
              {user.clientRoles.length ? user.clientRoles.map((role) => <span key={role} className="badge badge-muted">{role}</span>) : '—'}
            </div>
          </div>
        </section>
      </div>

      <section className="card profile-section">
        <div className="card-label">Разрешения</div>
        {user.permissions.length ? (
          <div className="permission-grid">
            {user.permissions.map((permission) => (
              <code key={permission} className="permission-chip">
                {permission}
              </code>
            ))}
          </div>
        ) : (
          <p className="auth-card-note">Разрешения не найдены.</p>
        )}
      </section>
    </>
  );
}
