import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUserRole } from "../hooks/useUserRole";
import { useProfileStatus } from "../hooks/useProfileStatus";
import { Box, CircularProgress } from "@mui/material";
import AppLayout from "../components/layout/AppLayout";

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated } = useAuth();
  const { isAdmin, isManager, isContentManager, isLoading: roleLoading } = useUserRole();

  // Admin não precisa verificar perfil; demais papéis verificam
  const needsProfileCheck = !isAdmin;
  const { isComplete, isLoading: profileLoading } = useProfileStatus(needsProfileCheck);

  // Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Aguarda carregar informações de role (e perfil, se necessário)
  if (roleLoading || (needsProfileCheck && profileLoading)) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Se não é admin, manager ou content_manager, redireciona para área do app
  if (!isAdmin && !isManager && !isContentManager) {
    return <Navigate to="/app/welcome" replace />;
  }

  // Admin tem acesso irrestrito; demais papéis precisam de perfil completo
  if (!isAdmin && !isComplete) {
    return <Navigate to="/app/complete-profile" replace />;
  }

  // Se passou todas verificações, renderiza com AppLayout
  return <AppLayout>{children}</AppLayout>;
}
