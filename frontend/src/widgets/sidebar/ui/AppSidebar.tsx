import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../features/auth/model/useAuth';
import type { HealthState } from '../../../features/health/model/useHealthStatus';
import { routePaths } from '../../../shared/config/routes';
import {
  ArticlesIcon,
  CompaniesIcon,
  DashboardIcon,
  FileIcon,
  LogoIcon,
  QueueIcon,
  SettingsIcon,
  ShieldIcon,
  TagsIcon,
  UserIcon,
} from '../../../shared/ui/icons/AppIcons';
import type { AppPermission } from '../../../entities/auth/model/types';

interface AppSidebarProps {
  sidebarOpen: boolean;
  health: HealthState;
}

interface NavigationItem {
  path: string;
  label: string;
  Icon: ComponentType;
  permission: AppPermission;
  end?: boolean;
}

const NAV_ITEMS: NavigationItem[] = [
  { path: routePaths.dashboard, label: 'Главная', Icon: DashboardIcon, permission: 'dashboard.view', end: true },
  { path: routePaths.articles, label: 'Статьи', Icon: ArticlesIcon, permission: 'articles.view' },
  { path: routePaths.companies, label: 'Компании', Icon: CompaniesIcon, permission: 'companies.view' },
  { path: routePaths.tags, label: 'Теги фильтра', Icon: TagsIcon, permission: 'tags.view' },
  { path: routePaths.queues, label: 'Очереди', Icon: QueueIcon, permission: 'queues.view' },
  { path: routePaths.settings, label: 'Настройки', Icon: SettingsIcon, permission: 'settings.view' },
  { path: routePaths.vpo, label: 'Свод ВПО', Icon: FileIcon, permission: 'vpo.view' },
  { path: routePaths.profile, label: 'Личный кабинет', Icon: UserIcon, permission: 'profile.view' },
  { path: routePaths.access, label: 'Доступ и роли', Icon: ShieldIcon, permission: 'access.users.view' },
];

function getHealthText(health: HealthState): string {
  if (health.loading) return 'Проверка...';
  if (health.error) return 'Нет соединения';
  if (health.status === 'ok') return 'Системы в норме';

  const degradedChecks = Object.entries(health.checks)
    .filter(([, value]) => value !== 'ok')
    .map(([key]) => key);

  return degradedChecks.length ? `Деградация: ${degradedChecks.join(', ')}` : 'Есть проблемы со связностью';
}

function getProviderLabel(provider: string | null): string {
  return provider === 'keycloak' ? 'Keycloak' : 'API key';
}

export function AppSidebar({ sidebarOpen, health }: AppSidebarProps) {
  const auth = useAuth();
  const healthDotClassName = !health.loading
    ? health.error || health.status !== 'ok'
      ? 'health-dot error'
      : 'health-dot ok'
    : 'health-dot';
  const visibleNavItems = NAV_ITEMS.filter((item) => auth.hasPermission(item.permission));

  let authStatusText = 'Загрузка конфигурации авторизации…';

  if (auth.status === 'ready') {
    if (auth.provider === 'keycloak') {
      authStatusText = auth.isAuthenticated ? 'Сессия Keycloak активна' : 'Требуется вход через Keycloak';
    } else if (!auth.authRequired) {
      authStatusText = auth.isAuthenticated ? 'Открытый доступ без обязательного ключа' : 'Доступ без обязательной авторизации';
    } else if (auth.isAuthenticated) {
      authStatusText = 'API key подтвержден';
    } else if (auth.apiKeyConfigured) {
      authStatusText = 'Сохранен API key, требуется проверка';
    } else {
      authStatusText = 'Сервер ожидает API key';
    }
  }

  return (
    <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="sidebar-header">
        <LogoIcon />
        <span>ParserNews</span>
      </div>

      <nav className="sidebar-nav">
        {visibleNavItems.map(({ path, label, Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="health-indicator">
          <span className={healthDotClassName} />
          <span className="health-text">{getHealthText(health)}</span>
        </div>

        <div className="auth-panel">
          <div className="auth-user-name">{auth.user?.displayName || 'Гость'}</div>
          <div className="auth-status">
            {getProviderLabel(auth.provider)} · {authStatusText}
          </div>
          {auth.error ? <div className="auth-error-text">{auth.error}</div> : null}
          {auth.user?.appRoles.length ? (
            <div className="role-badges">
              {auth.user.appRoles.map((role) => (
                <span key={role} className="badge badge-info">
                  {role}
                </span>
              ))}
            </div>
          ) : null}
          <div className="auth-actions">
            {auth.provider === 'keycloak' ? (
              auth.isAuthenticated ? (
                <button type="button" className="btn btn-secondary btn-sm auth-btn" onClick={() => void auth.logout()}>
                  Выйти
                </button>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm auth-btn" onClick={() => void auth.login()}>
                  Войти
                </button>
              )
            ) : (
              <>
                <button type="button" className="btn btn-secondary btn-sm auth-btn" onClick={() => void auth.promptForApiKey()}>
                  API key
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm auth-btn"
                  onClick={() => void auth.clearStoredApiKey()}
                  disabled={!auth.apiKeyConfigured && !auth.isAuthenticated}
                >
                  Очистить
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
