import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Chip,
  Skeleton,
} from "@mui/material";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  Logout as LogoutIcon,
  Lock as LockIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "../../hooks/useUserRole";

function getRoleLabel(
  isAdmin: boolean,
  isManager: boolean,
  isContentManager: boolean,
  isParticipant: boolean,
): string {
  if (isAdmin) return "Administrador";
  if (isManager) return "Gerente";
  if (isContentManager) return "Gerente de Conteúdo";
  if (isParticipant) return "Participante";
  return "Sem papel";
}

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    isAdmin,
    isManager,
    isContentManager,
    isParticipant,
    isLoading: roleLoading,
  } = useUserRole();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate("/app/profile");
  };

  const handleChangePassword = () => {
    handleClose();
    navigate("/change-password");
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate("/login");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const roleLabel = getRoleLabel(
    isAdmin,
    isManager,
    isContentManager,
    isParticipant,
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        overflowY: "scroll",
        scrollbarGutter: "stable",
      }}
    >
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Guardiões da Saúde
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              Perfil
            </Typography>
            <IconButton
              size="small"
              onClick={handleMenu}
              aria-controls={open ? "profile-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              color="inherit"
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "primary.contrastText",
                  color: "primary.main",
                }}
              >
                {user?.name ? getInitials(user.name) : "?"}
              </Avatar>
            </IconButton>
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              PaperProps={{
                sx: { minWidth: 240, mt: 1.5 },
              }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
            >
              <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "primary.main",
                      fontSize: 16,
                    }}
                  >
                    {user?.name ? getInitials(user.name) : "?"}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {user?.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      display="block"
                    >
                      {user?.email}
                    </Typography>
                  </Box>
                </Box>
                {roleLoading ? (
                  <Skeleton variant="rounded" width={100} height={22} />
                ) : (
                  <Chip
                    label={roleLabel}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                )}
              </Box>
              <Divider />
              <MenuItem onClick={handleProfile}>
                <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                Meu Perfil
              </MenuItem>
              <MenuItem onClick={handleChangePassword}>
                <LockIcon sx={{ mr: 1, fontSize: 20 }} />
                Alterar senha
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                Sair
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        maxWidth="md"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          mt: 10,
          mb: 4,
        }}
      >
        {children}
      </Container>

      <Box
        component="footer"
        sx={{
          py: 2,
          px: 2,
          mt: "auto",
          backgroundColor: (theme) =>
            theme.palette.mode === "light"
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Container maxWidth="md">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Guardiões da Saúde
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
