import { HashRouter } from 'react-router-dom';
import { ToastProvider } from './providers/ToastProvider';
import { AuthProvider } from './providers/AuthProvider';
import { AppRouter } from './router/AppRouter';
import { AppShell } from '../widgets/app-shell/ui/AppShell';
import { AppErrorBoundary } from '../shared/ui/error-boundary/AppErrorBoundary';

export function App() {
  return (
    <ToastProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <HashRouter>
            <AppShell>
              <AppRouter />
            </AppShell>
          </HashRouter>
        </AuthProvider>
      </AppErrorBoundary>
    </ToastProvider>
  );
}
