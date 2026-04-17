import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Avatar,
  Typography,
  IconButton,
  Collapse,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Folder as FolderIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  LibraryBooks as LibraryBooksIcon,
  Quiz as QuizIcon,
  AssignmentInd as AssignmentIndIcon,
  Logout as LogoutIcon,
  Close as CloseIcon,
  TrackChanges as TrackChangesIcon,
  Gavel as GavelIcon,
  TableChart as TableChartIcon,
  ExpandLess,
  ExpandMore,
  Autorenew as AutorenewIcon,
  AdminPanelSettings as RoleIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  VpnKey as VpnKeyIcon,
  SyncAlt as SyncAltIcon,
  Settings as SettingsIcon,
  Biotech as BiotechIcon,
  Tune as TuneIcon,
  Vaccines as VaccinesIcon,
  QueryStats as QueryStatsIcon,
} from "@mui/icons-material";
import { useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useUserRole } from "../../hooks/useUserRole";
import { useCurrentContext } from "../../contexts/CurrentContextContext";

const drawerWidth = 240;

/** Papéis que podem ver o item: admin (global), manager, content_manager */
type MenuRole = "admin" | "manager" | "content_manager";

interface MenuItem {
  path?: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  /** Quem pode ver este item. Se omitido, todos que acessam o admin veem. */
  roles?: MenuRole[];
}

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { isAdmin, isManager, isContentManager } = useUserRole();
  const { currentContext } = useCurrentContext();

  const canSeeByRole = (roles?: MenuRole[]): boolean => {
    if (!roles || roles.length === 0) return true;
    return roles.some(
      (r) =>
        (r === "admin" && isAdmin) ||
        (r === "manager" && isManager) ||
        (r === "content_manager" && isContentManager),
    );
  };

  const [expandedMenus, setExpandedMenus] = useState<{
    [key: string]: boolean;
  }>({
    basicTables:
      location.pathname.startsWith("/genders") ||
      location.pathname.startsWith("/legal-documents/types"),
    quizzes:
      location.pathname.startsWith("/quizzes") ||
      location.pathname.startsWith("/quiz-submissions"),
    "menu-9":
      location.pathname.startsWith("/tracks") ||
      location.pathname.startsWith("/admin/track-cycles"),
  });

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        path: "/",
        label: t("navigation.dashboard"),
        icon: <DashboardIcon />,
        roles: ["admin", "manager", "content_manager"],
      },
      {
        path: "/locations",
        label: t("navigation.locations"),
        icon: <LocationIcon />,
        roles: ["admin"],
      },
      {
        path: "/contexts",
        label: t("navigation.contexts"),
        icon: <FolderIcon />,
        roles: ["admin"],
      },
      {
        path: "/roles",
        label: "Papéis",
        icon: <RoleIcon />,
        roles: ["admin"],
      },
      {
        path: "/roles/permissions",
        label: "Permissões dos papéis",
        icon: <VpnKeyIcon />,
        roles: ["admin"],
      },
      {
        path: "/audit-logs",
        label: t("navigation.auditLogs"),
        icon: <HistoryIcon />,
        roles: ["admin"],
      },
      {
        path: "/admins",
        label: "Administradores",
        icon: <SecurityIcon />,
        roles: ["admin"],
      },
      {
        path: "/participations",
        label: t("navigation.participations"),
        icon: <AssignmentIcon />,
        roles: ["admin", "manager"],
      },
      {
        path: "/forms",
        label: t("forms.title"),
        icon: <DescriptionIcon />,
        roles: ["admin", "manager", "content_manager"],
      },
      {
        path: "/reports",
        label: t("navigation.reports"),
        icon: <AssessmentIcon />,
        roles: ["admin", "manager"],
      },
      {
        path: "/reports/days",
        label: t("navigation.reportStreaks"),
        icon: <LocalFireDepartmentIcon />,
        roles: ["admin"],
      },
      {
        path: "/contents",
        label: t("navigation.contents"),
        icon: <LibraryBooksIcon />,
        roles: ["admin", "manager", "content_manager"],
      },
      {
        label: "Quizes",
        icon: <QuizIcon />,
        roles: ["admin", "manager", "content_manager"],
        children: [
          {
            path: "/quizzes/forms",
            label: t("quizzes.forms.menuTitle"),
            icon: <DescriptionIcon />,
          },
          {
            path: "/quizzes",
            label: t("quizzes.menuTitle"),
            icon: <QuizIcon />,
          },
          {
            path: "/quiz-submissions",
            label: t("quizzes.submissions.menuTitle"),
            icon: <AssignmentIndIcon />,
          },
        ],
      },
      {
        label: "Trilhas de Conteúdo",
        icon: <TrackChangesIcon />,
        roles: ["admin", "manager"],
        children: [
          {
            path: "/tracks",
            label: "Gerenciar Trilhas",
            icon: <TrackChangesIcon />,
          },
          {
            path: "/admin/track-cycles",
            label: "Ciclos de Trilha",
            icon: <AutorenewIcon />,
          },
          {
            path: "/tracks/executions",
            label: "Registro de Execução",
            icon: <AssessmentIcon />,
          },
        ],
      },
      {
        label: "Integrações",
        icon: <SyncAltIcon />,
        roles: ["admin", "manager"],
        children: [
          {
            path: "/admin/integrations",
            label: "Eventos",
            icon: <SyncAltIcon />,
          },
          {
            path: "/admin/integrations/config",
            label: "Configuração",
            icon: <SettingsIcon />,
          },
        ],
      },
      {
        path: "/legal-documents",
        label: t("navigation.legalDocuments"),
        icon: <GavelIcon />,
        roles: ["admin"],
      },
      {
        label: t("navigation.basicTables"),
        icon: <TableChartIcon />,
        roles: ["admin"],
        children: [
          {
            path: "/genders",
            label: t("navigation.genders"),
            icon: <PeopleIcon />,
          },
          {
            path: "/legal-documents/types",
            label: t("navigation.legalDocumentTypes"),
            icon: <GavelIcon />,
          },
        ],
      },
      {
        label: "Classificação Sindrômica",
        icon: <BiotechIcon />,
        roles: ["admin", "manager"],
        children: [
          {
            path: "/admin/syndromic/symptoms",
            label: "Sintomas",
            icon: <AssignmentIcon />,
          },
          {
            path: "/admin/syndromic/syndromes",
            label: "Síndromes",
            icon: <VaccinesIcon />,
          },
          {
            path: "/admin/syndromic/weights",
            label: "Matriz de pesos",
            icon: <TableChartIcon />,
          },
          {
            path: "/admin/syndromic/form-configs",
            label: "Formulários (extração)",
            icon: <TuneIcon />,
          },
          {
            path: "/admin/syndromic/reports",
            label: "Relatórios",
            icon: <QueryStatsIcon />,
          },
        ],
      },
    ],
    [t],
  );

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => canSeeByRole(item.roles)),
    [menuItems, isAdmin, isManager, isContentManager],
  );

  const handleToggleMenu = (menuKey: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const isItemActive = (item: MenuItem): boolean => {
    if (item.path) {
      return location.pathname === item.path;
    }
    if (item.children) {
      return item.children.some((child) => isItemActive(child));
    }
    return false;
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    const menuKey = `menu-${index}`;
    const isExpanded = expandedMenus[menuKey] || false;
    const isActive = isItemActive(item);

    if (item.children) {
      return (
        <Box key={menuKey}>
          <ListItem disablePadding>
            <ListItemButton
              selected={isActive}
              onClick={() => handleToggleMenu(menuKey)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child, childIndex) => (
                <ListItem key={`${menuKey}-child-${childIndex}`} disablePadding>
                  <ListItemButton
                    selected={location.pathname === child.path}
                    onClick={() => {
                      if (child.path) {
                        navigate(child.path);
                        onClose();
                      }
                    }}
                    sx={{ pl: 4 }}
                  >
                    <ListItemIcon>{child.icon}</ListItemIcon>
                    <ListItemText primary={child.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Box>
      );
    }

    return (
      <ListItem key={item.path || menuKey} disablePadding>
        <ListItemButton
          selected={isActive}
          onClick={() => {
            if (item.path) {
              navigate(item.path);
              onClose();
            }
          }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      </ListItem>
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
        }}
      >
        <Typography variant="h6" noWrap component="div">
          {t("layout.menu")}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider />

      {user && (
        <>
          <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "primary.main" }}>
              {getInitials(user.name)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Contexto atual
            </Typography>
            <Typography
              variant="body2"
              noWrap
              title={currentContext?.name ?? "Todos os contextos"}
            >
              {currentContext?.name ?? "Todos os contextos"}
            </Typography>
          </Box>
          <Divider />
        </>
      )}

      <List sx={{ flexGrow: 1 }}>
        {visibleMenuItems.map((item, index) => renderMenuItem(item, index))}
      </List>

      {user && (
        <>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary={t("layout.logout")} />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          mt: "64px",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
