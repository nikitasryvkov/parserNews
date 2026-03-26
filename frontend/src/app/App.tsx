import { HashRouter } from 'react-router-dom';
import { ToastProvider } from './providers/ToastProvider';
import { AuthProvider } from './providers/AuthProvider';
import { AppRouter } from './router/AppRouter';
import { AppShell } from '../widgets/app-shell/ui/AppShell';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <AppShell>
            <AppRouter />
          </AppShell>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
