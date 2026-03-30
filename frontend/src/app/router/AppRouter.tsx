import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../features/auth/ui/ProtectedRoute';
import { AREA_OPTIONS } from '../../shared/config/areas';
import { routePaths } from '../../shared/config/routes';
import { LoadingState } from '../../shared/ui/loading-state/LoadingState';

const AccessPage = lazy(() => import('../../pages/access/ui/AccessPage').then((module) => ({ default: module.AccessPage })));
const AreaDashboardPage = lazy(() => import('../../pages/areas/ui/AreaDashboardPage').then((module) => ({ default: module.AreaDashboardPage })));
const ArticlesPage = lazy(() => import('../../pages/articles/ui/ArticlesPage').then((module) => ({ default: module.ArticlesPage })));
const CompaniesPage = lazy(() => import('../../pages/companies/ui/CompaniesPage').then((module) => ({ default: module.CompaniesPage })));
const DashboardPage = lazy(() => import('../../pages/dashboard/ui/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ProfilePage = lazy(() => import('../../pages/profile/ui/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const QueuesPage = lazy(() => import('../../pages/queues/ui/QueuesPage').then((module) => ({ default: module.QueuesPage })));
const SettingsPage = lazy(() => import('../../pages/settings/ui/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const TagsPage = lazy(() => import('../../pages/tags/ui/TagsPage').then((module) => ({ default: module.TagsPage })));
const VpoPage = lazy(() => import('../../pages/vpo/ui/VpoPage').then((module) => ({ default: module.VpoPage })));

function withSuspense(element: ReactNode): ReactNode {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path={routePaths.dashboard}
        element={(
          <ProtectedRoute permission="dashboard.view">
            {withSuspense(<DashboardPage />)}
          </ProtectedRoute>
        )}
      />
      {AREA_OPTIONS.map((area) => (
        <Route
          key={area.id}
          path={area.path}
          element={(
            <ProtectedRoute permission="dashboard.view">
              {withSuspense(<AreaDashboardPage area={area} />)}
            </ProtectedRoute>
          )}
        />
      ))}
      <Route
        path={routePaths.articles}
        element={(
          <ProtectedRoute permission="articles.view">
            {withSuspense(<ArticlesPage />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.companies}
        element={(
          <ProtectedRoute permission="companies.view">
            {withSuspense(<CompaniesPage />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.tags}
        element={(
          <ProtectedRoute permission="tags.view">
            {withSuspense(<TagsPage />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.queues}
        element={(
          <ProtectedRoute permission="queues.view">
            {withSuspense(<QueuesPage />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.settings}
        element={(
          <ProtectedRoute permission="settings.view">
            {withSuspense(<SettingsPage />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.vpo}
        element={(
          <ProtectedRoute permission="vpo.view">
            {withSuspense(<VpoPage />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.profile}
        element={(
          <ProtectedRoute permission="profile.view">
            {withSuspense(<ProfilePage />)}
          </ProtectedRoute>
        )}
      />
      <Route
        path={routePaths.access}
        element={(
          <ProtectedRoute permission="access.users.view">
            {withSuspense(<AccessPage />)}
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to={routePaths.dashboard} replace />} />
    </Routes>
  );
}
