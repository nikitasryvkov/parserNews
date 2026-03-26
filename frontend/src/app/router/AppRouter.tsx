import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../features/auth/ui/ProtectedRoute';
import { AccessPage } from '../../pages/access/ui/AccessPage';
import { ArticlesPage } from '../../pages/articles/ui/ArticlesPage';
import { CompaniesPage } from '../../pages/companies/ui/CompaniesPage';
import { DashboardPage } from '../../pages/dashboard/ui/DashboardPage';
import { ProfilePage } from '../../pages/profile/ui/ProfilePage';
import { QueuesPage } from '../../pages/queues/ui/QueuesPage';
import { SettingsPage } from '../../pages/settings/ui/SettingsPage';
import { TagsPage } from '../../pages/tags/ui/TagsPage';
import { VpoPage } from '../../pages/vpo/ui/VpoPage';
import { routePaths } from '../../shared/config/routes';

export function AppRouter() {
  return (
    <Routes>
      <Route
        path={routePaths.dashboard}
        element={(
          <ProtectedRoute permission="dashboard.view">
            <DashboardPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.articles}
        element={(
          <ProtectedRoute permission="articles.view">
            <ArticlesPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.companies}
        element={(
          <ProtectedRoute permission="companies.view">
            <CompaniesPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.tags}
        element={(
          <ProtectedRoute permission="tags.view">
            <TagsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.queues}
        element={(
          <ProtectedRoute permission="queues.view">
            <QueuesPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.settings}
        element={(
          <ProtectedRoute permission="settings.view">
            <SettingsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.vpo}
        element={(
          <ProtectedRoute permission="vpo.view">
            <VpoPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.profile}
        element={(
          <ProtectedRoute permission="profile.view">
            <ProfilePage />
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.access}
        element={(
          <ProtectedRoute permission="access.users.view">
            <AccessPage />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to={routePaths.dashboard} replace />} />
    </Routes>
  );
}
