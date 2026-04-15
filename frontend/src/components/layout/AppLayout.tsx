import { Box } from '@mui/material';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from './Header';
import Sidebar from './Sidebar';
import { CurrentContextProvider } from '../../contexts/CurrentContextContext';
import { useUserRole } from '../../hooks/useUserRole';
import { contextsService } from '../../api/services/contexts.service';
import type { ContextInfo } from '../../types/user.types';

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header onMenuClick={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: 3,
          bgcolor: 'background.default',
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isAdmin, contexts } = useUserRole();

  // Admin precisa de todos os contextos do sistema para poder trocar entre eles
  const { data: allContextsList } = useQuery({
    queryKey: ['contexts', { active: true, allPages: true }],
    queryFn: () => contextsService.findAllAllPages({ active: true }),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const availableContexts: ContextInfo[] = isAdmin
    ? (allContextsList ?? []).map((c) => ({ id: c.id, name: c.name }))
    : [
        ...contexts.asManager,
        ...contexts.asParticipant.filter(
          (p) => !contexts.asManager.some((m) => m.id === p.id),
        ),
      ];

  return (
    <CurrentContextProvider availableContexts={availableContexts}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </CurrentContextProvider>
  );
}
