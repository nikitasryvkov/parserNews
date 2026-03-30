import { type ComponentType, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth/model/useAuth';
import type { HealthState } from '../../../features/health/model/useHealthStatus';
import { AREA_OPTIONS, findAreaByPath } from '../../../shared/config/areas';
import { routePaths } from '../../../shared/config/routes';
import {
  AreaIcon,
  ArticlesIcon,
  ChevronDownIcon,
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
  { path: routePaths.vpo, label: 'Свод ВПО', Icon: FileIcon, permission: 'vpo.view' },
];

const SETTINGS_ITEMS: NavigationItem[] = [
  { path: routePaths.settings, label: 'Настройки РИА', Icon: SettingsIcon, permission: 'settings.view' },
  { path: routePaths.queues, label: 'Очереди', Icon: QueueIcon, permission: 'queues.view' },
  { path: routePaths.access, label: 'Доступ и роли', Icon: ShieldIcon, permission: 'access.users.view' },
];

function getHealthText(health: HealthState): string {
  if (health.loading) return 'Проверка...';
  if (health.error) return 'Нет соединения';
  if (health.status === 'ok') return 'Системы в норме';

  const degradedChecks = Object.entries(health.checks ?? {})
    .filter(([, value]) => value !== 'ok')
    .map(([key]) => key);

  return degradedChecks.length ? `Деградация: ${degradedChecks.join(', ')}` : 'Есть проблемы со связностью';
}

function getProviderLabel(provider: string | null): string {
  return provider === 'keycloak' ? 'Keycloak' : 'API key';
}

export function AppSidebar({ sidebarOpen, health }: AppSidebarProps) {
  const location = useLocation();
  const auth = useAuth();
  const userAppRoles = auth.user?.appRoles ?? [];
  const selectedArea = findAreaByPath(location.pathname);
  const [areasExpanded, setAreasExpanded] = useState(Boolean(selectedArea));
  const visibleSettingsItems = SETTINGS_ITEMS.filter((item) => auth.hasPermission(item.permission));
  const selectedSettingsItem = visibleSettingsItems.find((item) => item.path === location.pathname) ?? null;
  const [settingsExpanded, setSettingsExpanded] = useState(Boolean(selectedSettingsItem));
  const healthDotClassName = !health.loading
    ? health.error || health.status !== 'ok'
      ? 'health-dot error'
      : 'health-dot ok'
    : 'health-dot';
  const visibleNavItems = NAV_ITEMS.filter((item) => auth.hasPermission(item.permission));

  useEffect(() => {
    if (selectedArea) {
      setAreasExpanded(true);
    }
  }, [selectedArea]);

  useEffect(() => {
    if (selectedSettingsItem) {
      setSettingsExpanded(true);
    }
  }, [selectedSettingsItem]);

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
          <div key={path} className="sidebar-nav-group">
            <NavLink
              to={path}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>

            {path === routePaths.dashboard ? (
              <div className="sidebar-nav-group area-nav-group">
                <button
                  type="button"
                  className={`nav-link nav-accordion-toggle${selectedArea ? ' active' : ''}`}
                  aria-expanded={areasExpanded}
                  onClick={() => setAreasExpanded((current) => !current)}
                >
                  <AreaIcon />
                  <span>Область</span>
                  <ChevronDownIcon />
                </button>
                {areasExpanded ? (
                  <div className="nav-submenu" role="menu" aria-label="Выбор области">
                    {AREA_OPTIONS.map((area) => (
                      <NavLink
                        key={area.id}
                        to={area.path}
                        className={({ isActive }) => `nav-sublink${isActive ? ' active' : ''}`}
                      >
                        <span>{area.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {path === routePaths.tags && visibleSettingsItems.length ? (
              <div className="sidebar-nav-group settings-nav-group">
                <button
                  type="button"
                  className={`nav-link nav-accordion-toggle${selectedSettingsItem ? ' active' : ''}`}
                  aria-expanded={settingsExpanded}
                  onClick={() => setSettingsExpanded((current) => !current)}
                >
                  <SettingsIcon />
                  <span>Настройки</span>
                  <ChevronDownIcon />
                </button>
                {settingsExpanded ? (
                  <div className="nav-submenu" role="menu" aria-label="Разделы настроек">
                    {visibleSettingsItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-sublink${isActive ? ' active' : ''}`}
                      >
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
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
          {userAppRoles.length ? (
            <div className="role-badges">
              {userAppRoles.map((role) => (
                <span key={role} className="badge badge-info">
                  {role}
                </span>
              ))}
            </div>
          ) : null}
          {auth.hasPermission('profile.view') ? (
            <NavLink to={routePaths.profile} className={({ isActive }) => `auth-profile-link${isActive ? ' active' : ''}`}>
              <UserIcon />
              <span>Личный кабинет</span>
            </NavLink>
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
