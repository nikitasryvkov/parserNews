import { type ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth/model/useAuth';
import { useHealthStatus } from '../../../features/health/model/useHealthStatus';
import { AREA_OPTIONS, findAreaByPath } from '../../../shared/config/areas';
import { MenuIcon } from '../../../shared/ui/icons/AppIcons';
import { AppSidebar } from '../../sidebar/ui/AppSidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const auth = useAuth();
  const health = useHealthStatus(auth.sessionVersion);
  const selectedArea = findAreaByPath(location.pathname);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!sidebarOpen) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('.sidebar') || event.target.closest('.mobile-toggle')) return;

      setSidebarOpen(false);
    }

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [sidebarOpen]);

  return (
    <>
      <AppSidebar sidebarOpen={sidebarOpen} health={health} />

      <button
        type="button"
        className="mobile-toggle"
        aria-label="Menu"
        onClick={() => setSidebarOpen((current) => !current)}
      >
        <MenuIcon />
      </button>

      <main className="content">
        <div className="content-toolbar">
          <div className="content-toolbar-spacer" />
          <div className="area-switcher">
            <label className="area-switcher-label" htmlFor="app-area-switcher">
              Область
            </label>
            <select
              id="app-area-switcher"
              className="search-input area-switcher-select"
              value={selectedArea?.id ?? ''}
              onChange={(event) => {
                const nextArea = AREA_OPTIONS.find((area) => area.id === event.target.value);
                if (!nextArea) return;
                void navigate(nextArea.path);
              }}
            >
              <option value="">Выберите область</option>
              {AREA_OPTIONS.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {children}
      </main>
    </>
  );
}
