import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useUserRole } from "../hooks/useUserRole";
import { Box, CircularProgress } from "@mui/material";

interface AdminOnlyRouteProps {
  children: ReactNode;
}

/**
 * Restringe a administrador global. Usar dentro de AdminRoute.
 */
export default function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 240,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
