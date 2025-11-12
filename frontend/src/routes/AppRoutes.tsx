import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import SetupPage from '../features/setup/pages/SetupPage';
import FormBuilderPage from '../features/forms/pages/FormBuilderPage';
import FormsListPage from '../features/forms/pages/FormsListPage';
import FormCreatePage from '../features/forms/pages/FormCreatePage';
import FormEditPage from '../features/forms/pages/FormEditPage';
import FormViewPage from '../features/forms/pages/FormViewPage';
import FormVersionViewPage from '../features/forms/pages/FormVersionViewPage';
import FormVersionEditPage from '../features/forms/pages/FormVersionEditPage';
import ReportsListPage from '../features/reports/pages/ReportsListPage';
import ReportCreatePage from '../features/reports/pages/ReportCreatePage';
import ReportEditPage from '../features/reports/pages/ReportEditPage';
import ReportViewPage from '../features/reports/pages/ReportViewPage';
import ParticipationsListPage from '../features/participations/pages/ParticipationsListPage';
import ParticipationCreatePage from '../features/participations/pages/ParticipationCreatePage';
import ParticipationEditPage from '../features/participations/pages/ParticipationEditPage';
import ParticipationViewPage from '../features/participations/pages/ParticipationViewPage';
import UsersListPage from '../features/users/pages/UsersListPage';
import UserCreatePage from '../features/users/pages/UserCreatePage';
import UserEditPage from '../features/users/pages/UserEditPage';
import UserViewPage from '../features/users/pages/UserViewPage';
import LocationsListPage from '../features/locations/pages/LocationsListPage';
import LocationCreatePage from '../features/locations/pages/LocationCreatePage';
import LocationEditPage from '../features/locations/pages/LocationEditPage';
import LocationViewPage from '../features/locations/pages/LocationViewPage';
import ContextsListPage from '../features/contexts/pages/ContextsListPage';
import ContextCreatePage from '../features/contexts/pages/ContextCreatePage';
import ContextEditPage from '../features/contexts/pages/ContextEditPage';
import ContextViewPage from '../features/contexts/pages/ContextViewPage';
import ContextManagerEditPage from '../features/context-managers/pages/ContextManagerEditPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/form-builder"
        element={
          <ProtectedRoute>
            <FormBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forms"
        element={
          <ProtectedRoute>
            <FormsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forms/new"
        element={
          <ProtectedRoute>
            <FormCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forms/:id"
        element={
          <ProtectedRoute>
            <FormViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forms/:id/edit"
        element={
          <ProtectedRoute>
            <FormEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forms/:formId/versions/:id"
        element={
          <ProtectedRoute>
            <FormVersionViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forms/:formId/versions/:id/edit"
        element={
          <ProtectedRoute>
            <FormVersionEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/new"
        element={
          <ProtectedRoute>
            <ReportCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <ReportViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id/edit"
        element={
          <ProtectedRoute>
            <ReportEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participations"
        element={
          <ProtectedRoute>
            <ParticipationsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participations/new"
        element={
          <ProtectedRoute>
            <ParticipationCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participations/:id"
        element={
          <ProtectedRoute>
            <ParticipationViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participations/:id/edit"
        element={
          <ProtectedRoute>
            <ParticipationEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/new"
        element={
          <ProtectedRoute>
            <UserCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:id"
        element={
          <ProtectedRoute>
            <UserViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:id/edit"
        element={
          <ProtectedRoute>
            <UserEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <ProtectedRoute>
            <LocationsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations/new"
        element={
          <ProtectedRoute>
            <LocationCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations/:id"
        element={
          <ProtectedRoute>
            <LocationViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations/:id/edit"
        element={
          <ProtectedRoute>
            <LocationEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contexts"
        element={
          <ProtectedRoute>
            <ContextsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contexts/new"
        element={
          <ProtectedRoute>
            <ContextCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contexts/:id"
        element={
          <ProtectedRoute>
            <ContextViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contexts/:id/edit"
        element={
          <ProtectedRoute>
            <ContextEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contexts/:contextId/managers/:id/edit"
        element={
          <ProtectedRoute>
            <ContextManagerEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

