import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  Avatar,
  Box,
  Divider,
  Chip,
  MenuItem,
  Skeleton,
  Button,
  Popover,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  InputAdornment,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Lock as LockIcon,
  Hub as ContextIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import { useUserRole } from '../../hooks/useUserRole';
import { useCurrentContext } from '../../contexts/CurrentContextContext';
import LogoGds from '../common/LogoGds';

interface HeaderProps {
  onMenuClick: () => void;
}

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

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isAdmin, isManager, isContentManager, isParticipant, isLoading: roleLoading } =
    useUserRole();
  const { currentContext, setCurrentContext, availableContexts } = useCurrentContext();

  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [contextAnchorEl, setContextAnchorEl] = useState<null | HTMLElement>(null);
  const [contextSearch, setContextSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const profileOpen = Boolean(profileAnchorEl);
  const contextOpen = Boolean(contextAnchorEl);

  const handleProfileClick = (e: React.MouseEvent<HTMLElement>) =>
    setProfileAnchorEl(e.currentTarget);
  const handleProfileClose = () => setProfileAnchorEl(null);

  const handleContextClick = (e: React.MouseEvent<HTMLElement>) => {
    setContextAnchorEl(e.currentTarget);
    setContextSearch('');
    // Foca na busca ao abrir
    setTimeout(() => searchRef.current?.focus(), 50);
  };
  const handleContextClose = () => {
    setContextAnchorEl(null);
    setContextSearch('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleProfileClose();
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const roleLabel = getRoleLabel(isAdmin, isManager, isContentManager, isParticipant);

  // Filtra contextos pela busca
  const filteredContexts = contextSearch.trim()
    ? availableContexts.filter((c) =>
        c.name.toLowerCase().includes(contextSearch.toLowerCase()),
      )
    : availableContexts;

  const canSwitchContext = availableContexts.length > 1;

  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton color="inherit" aria-label="abrir menu" edge="start" onClick={onMenuClick} sx={{ mr: 1 }}>
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexGrow: 0, mr: 2, minWidth: 0 }}>
          <LogoGds height={30} withDarkBackdrop />
          <Typography variant="h6" component="div" noWrap>
            {t('layout.appTitle')}
          </Typography>
        </Box>

        {/* Seletor de contexto */}
        {!roleLoading && currentContext && (
          canSwitchContext ? (
            <>
              <Button
                onClick={handleContextClick}
                startIcon={<ContextIcon />}
                endIcon={<ExpandMoreIcon />}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none', maxWidth: 280 }}
              >
                <Typography noWrap variant="body2" sx={{ maxWidth: 200 }}>
                  {currentContext.name}
                </Typography>
              </Button>

              <Popover
                open={contextOpen}
                anchorEl={contextAnchorEl}
                onClose={handleContextClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{ sx: { width: 300, mt: 0.5 } }}
              >
                {/* Campo de busca */}
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                  <TextField
                    inputRef={searchRef}
                    size="small"
                    fullWidth
                    placeholder="Buscar contexto..."
                    value={contextSearch}
                    onChange={(e) => setContextSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {/* Lista de contextos */}
                <List
                  dense
                  sx={{ maxHeight: 320, overflowY: 'auto', py: 0.5 }}
                >
                  {filteredContexts.length === 0 ? (
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum contexto encontrado
                      </Typography>
                    </Box>
                  ) : (
                    filteredContexts.map((ctx) => {
                      const isSelected = currentContext.id === ctx.id;
                      return (
                        <ListItemButton
                          key={ctx.id}
                          selected={isSelected}
                          onClick={() => {
                            setCurrentContext(ctx);
                            handleContextClose();
                          }}
                          sx={{ borderRadius: 1, mx: 0.5 }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {isSelected ? (
                              <CheckIcon fontSize="small" color="primary" />
                            ) : (
                              <ContextIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={ctx.name}
                            primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                          />
                        </ListItemButton>
                      );
                    })
                  )}
                </List>
              </Popover>
            </>
          ) : (
            // Contexto único: exibe só o chip sem interação
            <Chip
              icon={<ContextIcon sx={{ fontSize: '14px !important' }} />}
              label={currentContext.name}
              size="small"
              variant="outlined"
              sx={{ fontSize: 12 }}
            />
          )
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Menu de perfil */}
        {user && (
          <Box>
            <IconButton
              onClick={handleProfileClick}
              size="small"
              aria-controls={profileOpen ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={profileOpen ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {getInitials(user.name)}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={profileAnchorEl}
              id="account-menu"
              open={profileOpen}
              onClose={handleProfileClose}
              onClick={handleProfileClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  minWidth: 240,
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 16 }}>
                    {getInitials(user.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {user.email}
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

              <MenuItem onClick={() => navigate('/change-password')}>
                <LockIcon sx={{ mr: 1, fontSize: 20 }} />
                {t('auth.changePassword')}
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                {t('layout.logout')}
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
