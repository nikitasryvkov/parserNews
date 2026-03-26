import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth/model/useAuth';
import { useHealthStatus } from '../../../features/health/model/useHealthStatus';
import { MenuIcon } from '../../../shared/ui/icons/AppIcons';
import { AppSidebar } from '../../sidebar/ui/AppSidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const auth = useAuth();
  const health = useHealthStatus(auth.sessionVersion);

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

      <main className="content">{children}</main>
    </>
  );
}
