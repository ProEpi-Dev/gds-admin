import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  IconButton,
  Avatar,
  Divider,
  Chip,
  Skeleton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Logout as LogoutIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Menu as MenuIcon,
  CalendarMonth as CalendarMonthIcon,
  School as SchoolIcon,
  Article as ArticleIcon,
  NotificationsActive as NotificationsActiveIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '../../hooks/useUserRole';
import { useTranslation } from '../../hooks/useTranslation';
import { hasModule, resolveEnabledModules } from '../../features/app/utils/contextModules';

function getRoleLabel(
  isAdmin: boolean,
  isManager: boolean,
  isContentManager: boolean,
  isParticipant: boolean,
): string {
  if (isAdmin) return 'Administrador';
  if (isManager) return 'Gerente';
  if (isContentManager) return 'Gerente de Conteúdo';
  if (isParticipant) return 'Participante';
  return 'Sem papel';
}

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isAdmin, isManager, isContentManager, isParticipant, isLoading: roleLoading } =
    useUserRole();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleClose = () => {
    setDrawerOpen(false);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/app/profile');
  };

  const handleHome = () => {
    handleClose();
    navigate('/app/inicio');
  };

  const handleChangePassword = () => {
    handleClose();
    navigate('/change-password');
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const roleLabel = getRoleLabel(isAdmin, isManager, isContentManager, isParticipant);
  const enabledModules = resolveEnabledModules(user?.participation?.context.modules);
  const showDaysModule = hasModule(enabledModules, 'self_health');
  const showSignalsModule = hasModule(enabledModules, 'community_signal');
  const navValue = useMemo(() => {
    const path = location.pathname;
    if (showDaysModule && path.startsWith('/app/dias')) return 'dias';
    if (showSignalsModule && path.startsWith('/app/sinais')) return 'sinais';
    if (path.startsWith('/app/aprenda')) return 'aprenda';
    if (path.startsWith('/app/conteudos')) return 'conteudos';
    return 'inicio';
  }, [location.pathname, showDaysModule, showSignalsModule]);
  const hideBottomNav = location.pathname.startsWith('/app/complete-profile');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1 }}
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Guardiões da Saúde
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 220 }} noWrap>
              Olá, {user?.name ?? 'Participante'}!
            </Typography>
            <Avatar sx={{ width: 32, height: 32 }}>{user?.name ? getInitials(user.name) : '?'}</Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={handleClose}>
        <Box sx={{ width: 280, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Avatar sx={{ width: 40, height: 40 }}>
              {user?.name ? getInitials(user.name) : '?'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {user?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {user?.email}
              </Typography>
            </Box>
          </Box>
          {roleLoading ? (
            <Skeleton variant="rounded" width={100} height={22} />
          ) : (
            <Chip label={roleLabel} size="small" variant="outlined" sx={{ fontSize: 11 }} />
          )}
        </Box>
        <Divider />
        <List sx={{ width: 280 }}>
          <ListItemButton onClick={handleHome}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary={t('userLayout.home')} />
          </ListItemButton>
          <ListItemButton onClick={handleProfile}>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Meu Perfil" />
          </ListItemButton>
          <ListItemButton onClick={handleChangePassword}>
            <ListItemIcon>
              <LockIcon />
            </ListItemIcon>
            <ListItemText primary="Alterar senha" />
          </ListItemButton>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sair" />
          </ListItemButton>
        </List>
      </Drawer>

      <Container
        component="main"
        maxWidth="md"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          mt: 10,
          mb: hideBottomNav ? 4 : 10,
        }}
      >
        {children}
      </Container>

      {!hideBottomNav && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: (theme) => theme.zIndex.appBar,
          }}
        >
          <BottomNavigation
            value={navValue}
            onChange={(_, nextValue) => {
              if (nextValue === 'inicio') navigate('/app/inicio');
              if (nextValue === 'dias' && showDaysModule) navigate('/app/dias');
              if (nextValue === 'sinais' && showSignalsModule) navigate('/app/sinais');
              if (nextValue === 'aprenda') navigate('/app/aprenda');
              if (nextValue === 'conteudos') navigate('/app/conteudos');
            }}
            showLabels
          >
            <BottomNavigationAction label="Início" value="inicio" icon={<HomeIcon />} />
            {showDaysModule && (
              <BottomNavigationAction label="Dias" value="dias" icon={<CalendarMonthIcon />} />
            )}
            {showSignalsModule && (
              <BottomNavigationAction
                label="Meus sinais"
                value="sinais"
                icon={<NotificationsActiveIcon />}
              />
            )}
            <BottomNavigationAction label="Aprenda" value="aprenda" icon={<SchoolIcon />} />
            <BottomNavigationAction label="Conteúdos" value="conteudos" icon={<ArticleIcon />} />
          </BottomNavigation>
        </Box>
      )}
    </Box>
  );
}
