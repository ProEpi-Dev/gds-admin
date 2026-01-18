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
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";

const drawerWidth = 240;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const menuItems = [
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
      path: "/quizzes",
      label: "Quizes",
      icon: <QuizIcon />,
    },
    {
      path: "/quiz-submissions",
      label: "Submissões de Quizes",
      icon: <AssignmentIndIcon />,
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
      path: "/legal-documents/types",
      label: t("navigation.legalDocumentTypes"),
      icon: <GavelIcon />,
    },
  ];

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
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                onClose();
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
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
