import type { ReactNode } from 'react';
import type { AppPermission } from '../../../entities/auth/model/types';
import { useAuth } from '../model/useAuth';
import { ErrorCard } from '../../../shared/ui/error-card/ErrorCard';
import { LoadingState } from '../../../shared/ui/loading-state/LoadingState';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: AppPermission;
}

function getProviderLabel(provider: string | null): string {
  return provider === 'keycloak' ? 'Keycloak' : 'API key';
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return <LoadingState />;
  }

  if (!auth.config) {
    return <ErrorCard message={auth.error || 'Не удалось загрузить конфигурацию авторизации'} />;
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="card auth-card">
        <div className="card-label">Авторизация</div>
        <h1 className="page-title">Вход в ParserNews</h1>
        <p className="auth-card-text">
          {auth.config.provider === 'keycloak'
            ? 'Для доступа к рабочим разделам выполните вход через Keycloak.'
            : auth.config.authRequired
              ? 'Сервер ожидает API key в заголовке Authorization.'
              : 'Сервер открыт без обязательной авторизации, но профиль пока не загружен.'}
        </p>
        {auth.error ? <p className="settings-page-status settings-page-status-error">{auth.error}</p> : null}
        <div className="auth-card-actions">
          <button type="button" className="btn btn-primary" onClick={() => void auth.login()}>
            {auth.config.provider === 'keycloak' ? 'Войти через Keycloak' : 'Ввести API key'}
          </button>
          {auth.config.provider === 'api_key' && auth.apiKeyConfigured ? (
            <button type="button" className="btn btn-secondary" onClick={() => void auth.clearStoredApiKey()}>
              Очистить ключ
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={() => void auth.reloadAuth()}>
            Обновить
          </button>
        </div>
        <p className="auth-card-note">Провайдер доступа: {getProviderLabel(auth.provider)}</p>
      </div>
    );
  }

  if (permission && !auth.hasPermission(permission)) {
    return (
      <div className="card auth-card">
        <div className="card-label">Недостаточно прав</div>
        <h1 className="page-title">Доступ ограничен</h1>
        <p className="auth-card-text">
          Вашей роли не хватает разрешения <code>{permission}</code> для просмотра этого раздела.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
