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
  const { isManager, isLoading: roleLoading } = useUserRole();
  const { isComplete, isLoading: profileLoading } = useProfileStatus();

  // Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Aguarda carregar informações de role e perfil
  if (roleLoading || profileLoading) {
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

  // Se não é manager, redireciona para área do app
  if (!isManager) {
    return <Navigate to="/app/welcome" replace />;
  }

  // Se perfil não está completo, redireciona para completar
  if (!isComplete) {
    return <Navigate to="/app/complete-profile" replace />;
  }

  // Se passou todas verificações, renderiza com AppLayout
  return <AppLayout>{children}</AppLayout>;
}
