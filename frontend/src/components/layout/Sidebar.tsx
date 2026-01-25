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
} from "@mui/icons-material";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";

const drawerWidth = 240;

interface MenuItem {
  path?: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
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
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({
    basicTables: location.pathname.startsWith('/genders') || location.pathname.startsWith('/legal-documents/types'),
    quizzes: location.pathname.startsWith('/quizzes') || location.pathname.startsWith('/quiz-submissions'),
  });

  const menuItems: MenuItem[] = [
    { path: "/", label: t("navigation.dashboard"), icon: <DashboardIcon /> },
    {
      path: "/form-builder",
      label: t("forms.formBuilder"),
      icon: <DescriptionIcon />,
    },
    { path: "/users", label: t("navigation.users"), icon: <PeopleIcon /> },
    {
      path: "/locations",
      label: t("navigation.locations"),
      icon: <LocationIcon />,
    },
    {
      path: "/contexts",
      label: t("navigation.contexts"),
      icon: <FolderIcon />,
    },
    {
      path: "/participations",
      label: t("navigation.participations"),
      icon: <AssignmentIcon />,
    },
    { path: "/forms", label: t("forms.title"), icon: <DescriptionIcon /> },
    {
      path: "/reports",
      label: t("navigation.reports"),
      icon: <AssessmentIcon />,
    },
    {
      path: "/contents",
      label: t("navigation.contents"),
      icon: <LibraryBooksIcon />,
    },
    {
      label: "Quizes",
      icon: <QuizIcon />,
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
      path: "/tracks",
      label: "Trilhas de Conteúdo",
      icon: <TrackChangesIcon />,
    },
    {
      path: "/legal-documents",
      label: t("navigation.legalDocuments"),
      icon: <GavelIcon />,
    },
    {
      label: t("navigation.basicTables"),
      icon: <TableChartIcon />,
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
  ];

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
          <Divider />
        </>
      )}

      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item, index) => renderMenuItem(item, index))}
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
