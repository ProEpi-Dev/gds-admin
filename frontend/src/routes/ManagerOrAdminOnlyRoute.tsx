import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useUserRole } from "../hooks/useUserRole";

interface ManagerOrAdminOnlyRouteProps {
  children: ReactNode;
}

/**
 * Restringe acesso a admin ou manager. Gerente de conteúdo é redirecionado ao dashboard.
 * Usar dentro de AdminRoute para rotas como Participações e Reports.
 */
export default function ManagerOrAdminOnlyRoute({ children }: ManagerOrAdminOnlyRouteProps) {
  const { isAdmin, isManager, isLoading } = useUserRole();

  if (isLoading) return null;

  if (!isAdmin && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
