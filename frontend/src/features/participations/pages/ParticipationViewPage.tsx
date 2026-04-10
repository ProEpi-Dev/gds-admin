import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  Divider,
  Stack,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteForever as DeleteForeverIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useState } from "react";
import {
  useParticipation,
  useDeleteParticipation,
} from "../hooks/useParticipations";
import {
  useParticipationRoles,
  useAddParticipationRole,
  useRemoveParticipationRole,
  useRoles,
} from "../../roles/hooks/useRoles";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTranslation } from "../../../hooks/useTranslation";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { getErrorMessage } from "../../../utils/errorHandler";
import {
  formatDateOnlyFromApi,
  formatDateTimeFromApi,
} from "../../../utils/formatDateOnlyFromApi";
import { useReports } from "../../reports/hooks/useReports";
import { useUserRole } from "../../../hooks/useUserRole";

const ROLE_COLOR: Record<string, "warning" | "info" | "success" | "default"> =
  {
    admin: "warning",
    manager: "info",
    content_manager: "success",
    participant: "default",
  };

export default function ParticipationViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();
  const snackbar = useSnackbar();
  const { isAdmin } = useUserRole();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");

  const participationId = id ? parseInt(id, 10) : null;
  const { data: participation, isLoading, error } = useParticipation(participationId);

  const { data: reportsData } = useReports(
    participation && participationId != null
      ? {
          participationId,
          pageSize: 100,
          contextId: participation.contextId,
        }
      : undefined,
    { enabled: !!participation && participationId != null },
  );

  const { data: participationRoles, isLoading: rolesLoading } =
    useParticipationRoles(participationId);

  const { data: allRoles } = useRoles();

  const deleteMutation = useDeleteParticipation();
  const addRoleMutation = useAddParticipationRole(participationId ?? 0);
  const removeRoleMutation = useRemoveParticipationRole(participationId ?? 0);

  const assignedRoleIds = new Set(participationRoles?.map((r) => r.id) ?? []);
  // Apenas papéis de contexto: superadmin não pode ser concedido via participação
  const availableRoles =
    allRoles?.filter(
      (r) => r.scope === "context" && !assignedRoleIds.has(r.id)
    ) ?? [];

  const handleDelete = () => {
    if (participationId) {
      const isActive = participation?.active ?? true;
      deleteMutation.mutate(participationId, {
        onSuccess: () => {
          snackbar.showSuccess(
            t(
              isActive
                ? "participations.deleteSuccess"
                : "participations.permanentDeleteSuccess",
            ),
          );
          navigate("/participations");
        },
        onError: (err) =>
          snackbar.showError(getErrorMessage(err, t("participations.deleteError"))),
      });
    }
  };

  const handleAddRole = () => {
    if (!selectedRoleId || !participationId) return;
    addRoleMutation.mutate(selectedRoleId as number, {
      onSuccess: () => {
        setSelectedRoleId("");
        snackbar.showSuccess("Papel atribuído com sucesso.");
      },
      onError: (err) => snackbar.showError(getErrorMessage(err)),
    });
  };

  const handleRemoveRole = (roleId: number, roleName: string) => {
    if (!participationId) return;
    removeRoleMutation.mutate(roleId, {
      onSuccess: () => snackbar.showSuccess(`Papel "${roleName}" removido.`),
      onError: (err) => snackbar.showError(getErrorMessage(err)),
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error || !participation)
    return (
      <ErrorAlert message={t("participations.errorLoadingParticipation")} />
    );

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate("/participations")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t("participations.title")} #{participation.id}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/participations/${participationId}/edit`)}
        >
          {t("common.edit")}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={
            participation.active ? <DeleteIcon /> : <DeleteForeverIcon />
          }
          onClick={() => setDeleteDialogOpen(true)}
        >
          {participation.active
            ? t("common.delete")
            : t("participations.permanentDeleteAction")}
        </Button>
      </Box>

      {/* Dados gerais */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("participations.user")}
            </Typography>
            <Typography variant="body1">
              {participation.userName
                ? `${participation.userName} (${participation.userEmail})`
                : `#${participation.userId}`}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("participations.context")}
            </Typography>
            <Typography variant="body1">#{participation.contextId}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("participations.startDate")}
            </Typography>
            <Typography variant="body1">
              {formatDateOnlyFromApi(participation.startDate)}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("participations.endDate")}
            </Typography>
            <Typography variant="body1">
              {participation.endDate
                ? formatDateOnlyFromApi(participation.endDate)
                : "-"}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("participations.status")}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={
                  participation.active
                    ? t("participations.active")
                    : t("participations.inactive")
                }
                color={participation.active ? "success" : "default"}
                size="small"
              />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("participations.createdAt")}
            </Typography>
            <Typography variant="body1">
              {participation.createdAt
                ? formatDateTimeFromApi(
                    participation.createdAt,
                    currentLanguage ?? "pt-BR",
                  )
                : "-"}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("participations.updatedAt")}
            </Typography>
            <Typography variant="body1">
              {participation.updatedAt
                ? formatDateTimeFromApi(
                    participation.updatedAt,
                    currentLanguage ?? "pt-BR",
                  )
                : "-"}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Papéis da participação */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Papéis
        </Typography>

        {rolesLoading ? (
          <LoadingSpinner />
        ) : (
          <Stack spacing={2}>
            {/* Chips dos papéis atribuídos */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, minHeight: 32 }}>
              {participationRoles && participationRoles.length > 0 ? (
                participationRoles.map((role) => (
                  <Chip
                    key={role.id}
                    label={role.name}
                    color={ROLE_COLOR[role.code] ?? "default"}
                    variant="outlined"
                    onDelete={
                      isAdmin
                        ? () => handleRemoveRole(role.id, role.name)
                        : undefined
                    }
                    deleteIcon={
                      <Tooltip title="Remover papel">
                        <CloseIcon fontSize="small" />
                      </Tooltip>
                    }
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhum papel atribuído.
                </Typography>
              )}
            </Box>

            {/* Formulário de atribuição (somente admin) */}
            {isAdmin && availableRoles.length > 0 && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Adicionar papel</InputLabel>
                  <Select
                    value={selectedRoleId}
                    label="Adicionar papel"
                    onChange={(e) =>
                      setSelectedRoleId(e.target.value as number)
                    }
                  >
                    {availableRoles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddRole}
                  disabled={!selectedRoleId || addRoleMutation.isPending}
                  sx={{ mt: 0.5 }}
                >
                  Atribuir
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </Paper>

      {/* Reports associados */}
      {reportsData && reportsData.data.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t("participations.associatedReports")} ({reportsData.data.length})
          </Typography>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {reportsData.data.map((report) => (
              <Box
                key={report.id}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2">
                    {t("reports.title")} #{report.id}
                  </Typography>
                  <Chip
                    label={
                      report.reportType === "POSITIVE"
                        ? t("reports.positive")
                        : t("reports.negative")
                    }
                    color={
                      report.reportType === "POSITIVE" ? "success" : "error"
                    }
                    size="small"
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t("participations.deleteConfirm")}
        message={
          participation.active
            ? t("participations.deleteMessage")
            : t("participations.deleteMessageInactive")
        }
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
