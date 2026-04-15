import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  LocationOn as LocationIcon,
  Folder as FolderIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  LibraryBooks as LibraryBooksIcon,
  School as SchoolIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { locationsService } from "../../../api/services/locations.service";
import { contextsService } from "../../../api/services/contexts.service";
import { participationsService } from "../../../api/services/participations.service";
import { formsService } from "../../../api/services/forms.service";
import { reportsService } from "../../../api/services/reports.service";
import { contentService } from "../../../api/services/content.service";
import { TrackService } from "../../../api/services/track.service";
import { useTranslation } from "../../../hooks/useTranslation";
import { useUserRole } from "../../../hooks/useUserRole";
import { useCurrentContext } from "../../../contexts/CurrentContextContext";

interface StatCardProps {
  title: string;
  count: number | undefined;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "info" | "success" | "warning" | "error";
  onClick?: () => void;
  onViewAll?: () => void;
  loading?: boolean;
}

function StatCard({
  title,
  count,
  icon,
  color,
  onClick,
  onViewAll,
  loading,
}: StatCardProps) {
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": onClick
          ? {
              transform: "translateY(-4px)",
              boxShadow: 4,
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: `${color}.light`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: `${color}.main`,
              "& .MuiSvgIcon-root": {
                fontSize: 28,
              },
            }}
          >
            {icon}
          </Box>
          {loading && <CircularProgress size={24} />}
        </Box>
        <Typography variant="h4" component="div" sx={{ mb: 1 }}>
          {loading ? "-" : count ?? 0}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {title}
        </Typography>
        {onViewAll && (
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onViewAll();
            }}
            sx={{ mt: "auto", alignSelf: "flex-start" }}
          >
            Ver todos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin, isManager } = useUserRole();
  const { currentContext } = useCurrentContext();

  // Contagens: Localizações e Contextos só para admin
  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations", { page: 1, pageSize: 1 }],
    queryFn: () => locationsService.findAll({ page: 1, pageSize: 1 }),
    enabled: isAdmin,
  });

  const { data: contextsData, isLoading: contextsLoading } = useQuery({
    queryKey: ["contexts", { page: 1, pageSize: 1 }],
    queryFn: () => contextsService.findAll({ page: 1, pageSize: 1 }),
    enabled: isAdmin,
  });

  const canSeeParticipationsAndReports = isAdmin || isManager;
  /** Admin: backend exige contextId explícito (cabeçalho). Demais papéis resolvem no servidor. */
  const listQueriesReady = isAdmin ? !!currentContext?.id : true;

  const { data: participationsData, isLoading: participationsLoading } =
    useQuery({
      queryKey: [
        "participations",
        { page: 1, pageSize: 1, contextId: currentContext?.id },
      ],
      queryFn: () =>
        participationsService.findAll({
          page: 1,
          pageSize: 1,
          contextId: currentContext?.id,
        }),
      enabled: canSeeParticipationsAndReports && listQueriesReady,
    });

  const { data: formsData, isLoading: formsLoading } = useQuery({
    queryKey: ["forms", { page: 1, pageSize: 1, contextId: currentContext?.id }],
    queryFn: () =>
      formsService.findAll({
        page: 1,
        pageSize: 1,
        contextId: currentContext?.id,
      }),
    enabled: listQueriesReady,
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: [
      "reports",
      { page: 1, pageSize: 1, contextId: currentContext?.id },
    ],
    queryFn: () =>
      reportsService.findAll({
        page: 1,
        pageSize: 1,
        contextId: currentContext?.id,
      }),
    enabled: canSeeParticipationsAndReports && listQueriesReady,
  });

  const { data: contentsData, isLoading: contentsLoading } = useQuery({
    queryKey: [
      "contents",
      { page: 1, pageSize: 1, contextId: currentContext?.id },
    ],
    queryFn: () =>
      contentService.findAll({
        page: 1,
        pageSize: 1,
        contextId: currentContext?.id,
      }),
    enabled: listQueriesReady,
  });

  const { data: tracksData, isLoading: tracksLoading } = useQuery({
    queryKey: ["tracks", { contextId: currentContext?.id }],
    queryFn: () =>
      TrackService.list(
        currentContext?.id != null ? { contextId: currentContext.id } : {},
      ).then((res) => ({
        data: res.data,
        meta: { totalItems: (res.data as any[]).length },
      })),
    enabled: listQueriesReady,
  });

  const stats: Array<{
    title: string;
    count: number | undefined;
    icon: React.ReactNode;
    color: "primary" | "secondary" | "info" | "success" | "warning" | "error";
    loading: boolean;
    onClick: () => void;
    onViewAll: () => void;
  }> = [
    ...(isAdmin
      ? [
          {
            title: t("navigation.locations"),
            count: locationsData?.meta.totalItems,
            icon: <LocationIcon />,
            color: "secondary" as const,
            loading: locationsLoading,
            onClick: () => navigate("/locations"),
            onViewAll: () => navigate("/locations"),
          },
          {
            title: t("navigation.contexts"),
            count: contextsData?.meta.totalItems,
            icon: <FolderIcon />,
            color: "info" as const,
            loading: contextsLoading,
            onClick: () => navigate("/contexts"),
            onViewAll: () => navigate("/contexts"),
          },
        ]
      : []),
    ...(isAdmin || isManager
      ? [
          {
            title: t("navigation.participations"),
            count: participationsData?.meta.totalItems,
            icon: <AssignmentIcon />,
            color: "success" as const,
            loading: participationsLoading,
            onClick: () => navigate("/participations"),
            onViewAll: () => navigate("/participations"),
          },
          {
            title: t("navigation.reports"),
            count: reportsData?.meta.totalItems,
            icon: <AssessmentIcon />,
            color: "error" as const,
            loading: reportsLoading,
            onClick: () => navigate("/reports"),
            onViewAll: () => navigate("/reports"),
          },
        ]
      : []),
    {
      title: t("forms.title"),
      count: formsData?.meta.totalItems,
      icon: <DescriptionIcon />,
      color: "warning",
      loading: formsLoading,
      onClick: () => navigate("/forms"),
      onViewAll: () => navigate("/forms"),
    },
    {
      title: t("navigation.contents"),
      count: contentsData?.meta.totalItems,
      icon: <LibraryBooksIcon />,
      color: "secondary",
      loading: contentsLoading,
      onClick: () => navigate("/contents"),
      onViewAll: () => navigate("/contents"),
    },
    {
      title: t("navigation.tracks"),
      count: tracksData?.meta.totalItems,
      icon: <SchoolIcon />,
      color: "warning",
      loading: tracksLoading,
      onClick: () => navigate("/tracks"),
      onViewAll: () => navigate("/tracks"),
    },
  ];

  const quickActions = [
    ...(isAdmin
      ? [
          {
            label: t("locations.newLocation"),
            path: "/locations/new",
            icon: <LocationIcon />,
          },
          {
            label: t("contexts.newContext"),
            path: "/contexts/new",
            icon: <FolderIcon />,
          },
        ]
      : []),
    ...(isAdmin || isManager
      ? [
          {
            label: t("participations.newParticipation"),
            path: "/participations/new",
            icon: <AssignmentIcon />,
          },
          {
            label: t("reports.newReport"),
            path: "/reports/new",
            icon: <AssessmentIcon />,
          },
        ]
      : []),
    {
      label: t("forms.newForm"),
      path: "/forms/new",
      icon: <DescriptionIcon />,
    },
    {
      label: t("tracks.newTrack"),
      path: "/tracks/new",
      icon: <SchoolIcon />,
    },
    {
      label: t("contents.newContent"),
      path: "/contents/new",
      icon: <LibraryBooksIcon />,
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        {t("dashboard.title")}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 3,
          mb: 4,
        }}
      >
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            count={stat.count}
            icon={stat.icon}
            color={stat.color}
            loading={stat.loading}
            onClick={stat.onClick}
            onViewAll={stat.onViewAll}
          />
        ))}
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t("dashboard.quickActions")}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant="outlined"
                startIcon={action.icon}
                endIcon={<AddIcon />}
                onClick={() => navigate(action.path)}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
