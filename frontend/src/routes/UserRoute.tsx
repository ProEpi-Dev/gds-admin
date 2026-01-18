import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { Box, CircularProgress } from '@mui/material';

interface UserRouteProps {
  children: ReactNode;
  requireCompleteProfile?: boolean;
}

export default function UserRoute({ children, requireCompleteProfile = true }: UserRouteProps) {
  const { isAuthenticated } = useAuth();
  
  // Só verifica status do perfil se necessário
  const { isComplete, isLoading } = useProfileStatus(requireCompleteProfile);

  // Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se não requer perfil completo (ex: página de completar perfil), renderiza direto
  if (!requireCompleteProfile) {
    return <>{children}</>;
  }

  // Aguarda carregar status do perfil
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Se perfil não está completo, redireciona para completar
  if (!isComplete) {
    return <Navigate to="/app/complete-profile" replace />;
  }

  // Renderiza o conteúdo
  return <>{children}</>;
}
