import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUserRole } from "../hooks/useUserRole";
import AppLayout from "../components/layout/AppLayout";
import AdminRoute from "./AdminRoute";
import UserRoute from "./UserRoute";
import LoginPage from "../features/auth/pages/LoginPage";
import SignupPage from "../features/auth/pages/SignupPage";
import ChangePasswordPage from "../features/auth/pages/ChangePasswordPage";
import WelcomePage from "../features/app/pages/WelcomePage";
import CompleteProfilePage from "../features/app/pages/CompleteProfilePage";
import UserProfilePage from "../features/app/pages/UserProfilePage";
import SetupPage from "../features/setup/pages/SetupPage";
import FormBuilderPage from "../features/forms/pages/FormBuilderPage";
import FormsListPage from "../features/forms/pages/FormsListPage";
import FormCreatePage from "../features/forms/pages/FormCreatePage";
import FormEditPage from "../features/forms/pages/FormEditPage";
import FormViewPage from "../features/forms/pages/FormViewPage";
import FormVersionViewPage from "../features/forms/pages/FormVersionViewPage";
import FormVersionEditPage from "../features/forms/pages/FormVersionEditPage";
import ReportsListPage from "../features/reports/pages/ReportsListPage";
import ReportsMapPage from "../features/reports/pages/ReportsMapPage";
import ReportCreatePage from "../features/reports/pages/ReportCreatePage";
import ReportEditPage from "../features/reports/pages/ReportEditPage";
import ReportViewPage from "../features/reports/pages/ReportViewPage";
import ParticipationsListPage from "../features/participations/pages/ParticipationsListPage";
import ParticipationCreatePage from "../features/participations/pages/ParticipationCreatePage";
import ParticipationEditPage from "../features/participations/pages/ParticipationEditPage";
import ParticipationViewPage from "../features/participations/pages/ParticipationViewPage";
import UsersListPage from "../features/users/pages/UsersListPage";
import UserCreatePage from "../features/users/pages/UserCreatePage";
import UserEditPage from "../features/users/pages/UserEditPage";
import UserViewPage from "../features/users/pages/UserViewPage";
import LocationsListPage from "../features/locations/pages/LocationsListPage";
import LocationCreatePage from "../features/locations/pages/LocationCreatePage";
import LocationEditPage from "../features/locations/pages/LocationEditPage";
import LocationViewPage from "../features/locations/pages/LocationViewPage";
import ContextsListPage from "../features/contexts/pages/ContextsListPage";
import ContextCreatePage from "../features/contexts/pages/ContextCreatePage";
import ContextEditPage from "../features/contexts/pages/ContextEditPage";
import ContextViewPage from "../features/contexts/pages/ContextViewPage";
import ContextManagerEditPage from "../features/context-managers/pages/ContextManagerEditPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import ContentList from "../features/content/ContentList";
import ContentForm from "../features/content/ContentForm";
import TrackList from "../features/tracks/TrackList";
import TrackForm from "../features/tracks/TrackForm";
import QuizzesListPage from "../features/quizzes/pages/QuizzesListPage";
import QuizFormsListPage from "../features/quizzes/pages/QuizFormsListPage";
import QuizTakePage from "../features/quizzes/pages/QuizTakePage";
import QuizViewPage from "../features/quizzes/pages/QuizViewPage";
import QuizSubmissionViewPage from "../features/quizzes/pages/QuizSubmissionViewPage";
import QuizSubmissionsListPage from "../features/quizzes/pages/QuizSubmissionsListPage";
import LegalDocumentsListPage from "../features/legal-documents/pages/LegalDocumentsListPage";
import LegalDocumentFormPage from "../features/legal-documents/pages/LegalDocumentFormPage";
import LegalDocumentTypesListPage from "../features/legal-documents/pages/LegalDocumentTypesListPage";
import LegalDocumentTypeFormPage from "../features/legal-documents/pages/LegalDocumentTypeFormPage";
import GendersListPage from "../features/genders/pages/GendersListPage";
import GenderCreatePage from "../features/genders/pages/GenderCreatePage";
import GenderEditPage from "../features/genders/pages/GenderEditPage";
import GenderViewPage from "../features/genders/pages/GenderViewPage";
import TrackView from "../features/tracks/TrackView";
import TrackExecutionRegistry from "../features/tracks/TrackRegister";

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

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  const { isManager, isLoading } = useUserRole();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  // Se é manager, vai para dashboard, senão para área do app
  if (isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/app/welcome" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Rotas da Área do App (Usuários Comuns) */}
      <Route
        path="/app/complete-profile"
        element={
          <UserRoute requireCompleteProfile={false}>
            <CompleteProfilePage />
          </UserRoute>
        }
      />
      <Route
        path="/app/welcome"
        element={
          <UserRoute>
            <WelcomePage />
          </UserRoute>
        }
      />
      <Route
        path="/app/profile"
        element={
          <UserRoute>
            <UserProfilePage />
          </UserRoute>
        }
      />
      <Route path="/app" element={<Navigate to="/app/welcome" replace />} />

      {/* Rota Raiz - Redireciona baseado no role */}
      <Route path="/" element={<RootRedirect />} />

      {/* Rotas Protegidas (Apenas Admins) */}
      <Route
        path="/dashboard"
        element={
          <AdminRoute>
            <DashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/form-builder"
        element={
          <AdminRoute>
            <FormBuilderPage />
          </AdminRoute>
        }
      />
      <Route
        path="/forms"
        element={
          <AdminRoute>
            <FormsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/forms/new"
        element={
          <AdminRoute>
            <FormCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/forms/:id"
        element={
          <AdminRoute>
            <FormViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/forms/:id/edit"
        element={
          <AdminRoute>
            <FormEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/forms/:formId/versions/:id"
        element={
          <AdminRoute>
            <FormVersionViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/forms/:formId/versions/:id/edit"
        element={
          <AdminRoute>
            <FormVersionEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <AdminRoute>
            <ReportsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/reports/map"
        element={
          <AdminRoute>
            <ReportsMapPage />
          </AdminRoute>
        }
      />
      <Route
        path="/reports/new"
        element={
          <AdminRoute>
            <ReportCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <AdminRoute>
            <ReportViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/reports/:id/edit"
        element={
          <AdminRoute>
            <ReportEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/participations"
        element={
          <AdminRoute>
            <ParticipationsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/participations/new"
        element={
          <AdminRoute>
            <ParticipationCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/participations/:id"
        element={
          <AdminRoute>
            <ParticipationViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/participations/:id/edit"
        element={
          <AdminRoute>
            <ParticipationEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/users"
        element={
          <AdminRoute>
            <UsersListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/users/new"
        element={
          <AdminRoute>
            <UserCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/users/:id"
        element={
          <AdminRoute>
            <UserViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/users/:id/edit"
        element={
          <AdminRoute>
            <UserEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <AdminRoute>
            <LocationsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/locations/new"
        element={
          <AdminRoute>
            <LocationCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/locations/:id"
        element={
          <AdminRoute>
            <LocationViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/locations/:id/edit"
        element={
          <AdminRoute>
            <LocationEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/genders"
        element={
          <AdminRoute>
            <GendersListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/genders/new"
        element={
          <AdminRoute>
            <GenderCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/genders/:id"
        element={
          <AdminRoute>
            <GenderViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/genders/:id/edit"
        element={
          <AdminRoute>
            <GenderEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/contexts"
        element={
          <AdminRoute>
            <ContextsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/contexts/new"
        element={
          <AdminRoute>
            <ContextCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/contexts/:id"
        element={
          <AdminRoute>
            <ContextViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/contexts/:id/edit"
        element={
          <AdminRoute>
            <ContextEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/contexts/:contextId/managers/:id/edit"
        element={
          <AdminRoute>
            <ContextManagerEditPage />
          </AdminRoute>
        }
      />
      <Route
        path="/contents/new"
        element={
          <AdminRoute>
            <ContentForm />
          </AdminRoute>
        }
      />
      <Route
        path="/contents/:id/edit"
        element={
          <AdminRoute>
            <ContentForm />
          </AdminRoute>
        }
      />
      <Route
        path="/contents"
        element={
          <AdminRoute>
            <ContentList />
          </AdminRoute>
        }
      />
      <Route
        path="/tracks"
        element={
          <AdminRoute>
            <TrackList />
          </AdminRoute>
        }
      />
      <Route
        path="/tracks/new"
        element={
          <AdminRoute>
            <TrackForm />
          </AdminRoute>
        }
      />
      <Route
        path="/tracks/:id"
        element={
          <AdminRoute>
            <TrackView />
          </AdminRoute>
        }
      />
      <Route
        path="/tracks/:id/edit"
        element={
          <AdminRoute>
            <TrackForm />
          </AdminRoute>
        }
      />
      <Route
        path="/tracks/executions"
        element={
          <AdminRoute>
            <TrackExecutionRegistry />
          </AdminRoute>
        }
      />

      <Route
        path="/legal-documents"
        element={
          <AdminRoute>
            <LegalDocumentsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/legal-documents/new"
        element={
          <AdminRoute>
            <LegalDocumentFormPage />
          </AdminRoute>
        }
      />
      <Route
        path="/legal-documents/:id/edit"
        element={
          <AdminRoute>
            <LegalDocumentFormPage />
          </AdminRoute>
        }
      />
      <Route
        path="/legal-documents/types"
        element={
          <AdminRoute>
            <LegalDocumentTypesListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/legal-documents/types/new"
        element={
          <AdminRoute>
            <LegalDocumentTypeFormPage />
          </AdminRoute>
        }
      />
      <Route
        path="/legal-documents/types/:id/edit"
        element={
          <AdminRoute>
            <LegalDocumentTypeFormPage />
          </AdminRoute>
        }
      />
      <Route
        path="/quizzes/forms"
        element={
          <AdminRoute>
            <QuizFormsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/quizzes"
        element={
          <AdminRoute>
            <QuizzesListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/quizzes/:quizId/content/:contentId"
        element={
          <AdminRoute>
            <QuizTakePage />
          </AdminRoute>
        }
      />
      <Route
        path="/quizzes/:quizId"
        element={
          <AdminRoute>
            <QuizViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/quiz-submissions"
        element={
          <AdminRoute>
            <QuizSubmissionsListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/quiz-submissions/:id"
        element={
          <AdminRoute>
            <QuizSubmissionViewPage />
          </AdminRoute>
        }
      />
      <Route
        path="/*"
        element={
          <AdminRoute>
            <DashboardPage />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
