import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUserRole } from "../hooks/useUserRole";
import AppLayout from "../components/layout/AppLayout";
import AdminRoute from "./AdminRoute";
import ManagerOrAdminOnlyRoute from "./ManagerOrAdminOnlyRoute";
import UserRoute from "./UserRoute";
import LoginPage from "../features/auth/pages/LoginPage";
import SignupPage from "../features/auth/pages/SignupPage";
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import VerifyEmailPage from "../features/auth/pages/VerifyEmailPage";
import EmailVerifiedPage from "../features/auth/pages/EmailVerifiedPage";
import ChangePasswordPage from "../features/auth/pages/ChangePasswordPage";
import CompleteProfilePage from "../features/app/pages/CompleteProfilePage";
import UserProfilePage from "../features/app/pages/UserProfilePage";
import AppHomePage from "../features/app/pages/AppHomePage";
import AppDaysPage from "../features/app/pages/AppDaysPage";
import AppLearnPage from "../features/app/pages/AppLearnPage";
import AppLearnCyclePage from "../features/app/pages/AppLearnCyclePage";
import AppLearnContentPage from "../features/app/pages/AppLearnContentPage";
import AppContentsPage from "../features/app/pages/AppContentsPage";
import AppContentViewPage from "../features/app/pages/AppContentViewPage";
import AppSignalsPage from "../features/app/pages/AppSignalsPage";
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
import ReportStreaksPage from "../features/reports/pages/ReportStreaksPage";
import ReportCreatePage from "../features/reports/pages/ReportCreatePage";
import ReportEditPage from "../features/reports/pages/ReportEditPage";
import ReportViewPage from "../features/reports/pages/ReportViewPage";
import ParticipationsListPage from "../features/participations/pages/ParticipationsListPage";
import ParticipationCreatePage from "../features/participations/pages/ParticipationCreatePage";
import ParticipationEditPage from "../features/participations/pages/ParticipationEditPage";
import ParticipationViewPage from "../features/participations/pages/ParticipationViewPage";
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
import TrackCyclesListPage from "../features/track-cycles/pages/TrackCyclesListPage";
import TrackCycleFormPage from "../features/track-cycles/pages/TrackCycleFormPage";
import TrackCycleStudentsPage from "../features/track-cycles/pages/TrackCycleStudentsPage";
import TrackCycleProgressPage from "../features/track-cycles/pages/TrackCycleProgressPage";
import TrackCycleQuizTakePage from "../features/track-cycles/pages/TrackCycleQuizTakePage";
import RolesListPage from "../features/roles/pages/RolesListPage";
import RolePermissionsPage from "../features/roles/pages/RolePermissionsPage";
import AdminOnlyRoute from "./AdminOnlyRoute";
import AdminsListPage from "../features/admins/pages/AdminsListPage";
import IntegrationEventsPage from "../features/report-integrations/pages/IntegrationEventsPage";
import IntegrationConfigPage from "../features/report-integrations/pages/IntegrationConfigPage";
import AuditLogsListPage from "../features/audit-logs/pages/AuditLogsListPage";
import SyndromicSymptomsPage from "../features/syndromic/pages/SyndromicSymptomsPage";
import SyndromicSyndromesPage from "../features/syndromic/pages/SyndromicSyndromesPage";
import SyndromicWeightsMatrixPage from "../features/syndromic/pages/SyndromicWeightsMatrixPage";
import SyndromicReportsPage from "../features/syndromic/pages/SyndromicReportsPage";
import SyndromicBiExportKeysPage from "../features/syndromic/pages/SyndromicBiExportKeysPage";
import SyndromicFormConfigsPage from "../features/syndromic/pages/SyndromicFormConfigsPage";
import { hasModule, resolveEnabledModules } from "../features/app/utils/contextModules";

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
  const { isAdmin, isManager, isContentManager, isLoading } = useUserRole();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  // Admin, manager ou content_manager vão para o dashboard; demais para área do app
  if (isAdmin || isManager || isContentManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/app/inicio" replace />;
}

function AppDaysRoute() {
  const { user } = useAuth();
  const modules = resolveEnabledModules(user?.participation?.context.modules);
  if (!hasModule(modules, "self_health") && !hasModule(modules, "community_signal")) {
    return <Navigate to="/app/inicio" replace />;
  }
  return <AppDaysPage />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/email-verified" element={<EmailVerifiedPage />} />
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
        path="/app/inicio"
        element={
          <UserRoute>
            <AppHomePage />
          </UserRoute>
        }
      />
      <Route
        path="/app/dias"
        element={
          <UserRoute>
            <AppDaysRoute />
          </UserRoute>
        }
      />
      <Route
        path="/app/aprenda"
        element={
          <UserRoute>
            <AppLearnPage />
          </UserRoute>
        }
      />
      <Route
        path="/app/sinais"
        element={
          <UserRoute>
            <AppSignalsPage />
          </UserRoute>
        }
      />
      <Route
        path="/app/aprenda/ciclo/:cycleId"
        element={
          <UserRoute>
            <AppLearnCyclePage />
          </UserRoute>
        }
      />
      <Route
        path="/app/aprenda/ciclo/:cycleId/conteudo/:sequenceId/:contentId"
        element={
          <UserRoute>
            <AppLearnContentPage />
          </UserRoute>
        }
      />
      <Route
        path="/app/aprenda/ciclo/:id/quiz/:sequenceId"
        element={
          <UserRoute>
            <TrackCycleQuizTakePage />
          </UserRoute>
        }
      />
      <Route
        path="/app/conteudos"
        element={
          <UserRoute>
            <AppContentsPage />
          </UserRoute>
        }
      />
      <Route
        path="/app/conteudos/:contentId"
        element={
          <UserRoute>
            <AppContentViewPage />
          </UserRoute>
        }
      />
      <Route
        path="/app/welcome"
        element={
          <UserRoute>
            <Navigate to="/app/inicio" replace />
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
      <Route path="/app" element={<Navigate to="/app/inicio" replace />} />

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
            <ManagerOrAdminOnlyRoute>
              <ReportsListPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/reports/map"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <ReportsMapPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/reports/days"
        element={
          <AdminRoute>
            <ReportStreaksPage />
          </AdminRoute>
        }
      />
      <Route
        path="/reports/streaks"
        element={<Navigate to="/reports/days" replace />}
      />
      <Route
        path="/reports/new"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <ReportCreatePage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <ReportViewPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/reports/:id/edit"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <ReportEditPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/participations"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <ParticipationsListPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/participations/new"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <ParticipationCreatePage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/participations/:id"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <ParticipationViewPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/participations/:id/edit"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <ParticipationEditPage />
            </ManagerOrAdminOnlyRoute>
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

      {/* Track Cycles Routes */}
      <Route
        path="/admin/track-cycles"
        element={
          <AdminRoute>
            <TrackCyclesListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/track-cycles/create"
        element={
          <AdminRoute>
            <TrackCycleFormPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/track-cycles/:id/edit"
        element={
          <AdminRoute>
            <TrackCycleFormPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/track-cycles/:id/students"
        element={
          <AdminRoute>
            <TrackCycleStudentsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/track-cycles/:id/participation/:participationId/trilha"
        element={
          <AdminRoute>
            <TrackCycleProgressPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/track-cycles/:id/participation/:participationId/quiz/:sequenceId"
        element={
          <AdminRoute>
            <TrackCycleQuizTakePage />
          </AdminRoute>
        }
      />

      <Route
        path="/roles"
        element={
          <AdminRoute>
            <RolesListPage />
          </AdminRoute>
        }
      />
      <Route
        path="/roles/permissions"
        element={
          <AdminRoute>
            <AdminOnlyRoute>
              <RolePermissionsPage />
            </AdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <AdminRoute>
            <AdminOnlyRoute>
              <AuditLogsListPage />
            </AdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admins"
        element={
          <AdminRoute>
            <AdminsListPage />
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
      {/* Integração externa */}
      <Route
        path="/admin/integrations"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <IntegrationEventsPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/integrations/config"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <IntegrationConfigPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/syndromic/symptoms"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <SyndromicSymptomsPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/syndromic/syndromes"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <SyndromicSyndromesPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/syndromic/weights"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <SyndromicWeightsMatrixPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/syndromic/form-configs"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <SyndromicFormConfigsPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/syndromic/reports"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <SyndromicReportsPage />
            </ManagerOrAdminOnlyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/syndromic/bi-export-api-keys"
        element={
          <AdminRoute>
            <ManagerOrAdminOnlyRoute>
              <SyndromicBiExportKeysPage />
            </ManagerOrAdminOnlyRoute>
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
