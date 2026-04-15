import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  PlaylistAdd as PlaylistAddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useForms, useDeleteForm } from "../../forms/hooks/useForms";
import { useCurrentContext } from "../../../contexts/CurrentContextContext";
import { TrackService } from "../../../api/services/track.service";
import DataTable, { type Column } from "../../../components/common/DataTable";
import FilterChips from "../../../components/common/FilterChips";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import FormPreview from "../../../components/form-builder/FormPreview";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { useTranslation } from "../../../hooks/useTranslation";
import { useSnackbar } from "../../../hooks/useSnackbar";
import type { Form } from "../../../types/form.types";

export default function QuizFormsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const snackbar = useSnackbar();
  const { currentContext } = useCurrentContext();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(
    undefined,
  );
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [formToPreview, setFormToPreview] = useState<Form | null>(null);

  // Add to track dialog
  const [addToTrackDialogOpen, setAddToTrackDialogOpen] = useState(false);
  const [formToAdd, setFormToAdd] = useState<Form | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [addingToTrack, setAddingToTrack] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);

  const deleteFormMutation = useDeleteForm();

  // Backend exige contextId; listar apenas quizzes do contexto selecionado
  const { data, isLoading, error } = useForms(
    {
      page,
      pageSize,
      active: activeFilter,
      type: "quiz",
      contextId: currentContext?.id,
    },
    { enabled: currentContext?.id != null }
  );

  // Carregar trilhas ao abrir o modal (filtra pelo contexto atual quando houver)
  useEffect(() => {
    if (!addToTrackDialogOpen) return;
    const params =
      currentContext?.id != null ? { contextId: currentContext.id } : undefined;
    TrackService.list(params)
      .then((res) => setTracks(Array.isArray(res.data) ? res.data : []))
      .catch((err: unknown) => {
        console.error("Erro ao carregar trilhas:", err);
        setTracks([]);
        snackbar.showError(t("forms.errorLoading"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarregar só ao abrir o modal ou mudar contexto
  }, [addToTrackDialogOpen, currentContext?.id]);

  const handlePreview = (form: Form) => {
    setFormToPreview(form);
    setPreviewDialogOpen(true);
  };

  const handleAddToTrack = (form: Form) => {
    setFormToAdd(form);
    setSelectedTrackId(null);
    setSelectedSectionId(null);
    setAddToTrackDialogOpen(true);
  };

  const handleDeleteClick = (form: Form) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteForm = () => {
    if (!formToDelete) return;
    deleteFormMutation.mutate(formToDelete.id, {
      onSuccess: () => {
        snackbar.showSuccess(t("common.success"));
        setDeleteDialogOpen(false);
        setFormToDelete(null);
      },
      onError: () => {
        snackbar.showError(t("forms.errorLoading"));
      },
    });
  };

  const handleConfirmAddToTrack = async () => {
    if (!formToAdd || !selectedTrackId || !selectedSectionId) return;

    setAddingToTrack(true);
    try {
      await TrackService.addFormToSection(
        selectedTrackId,
        selectedSectionId,
        formToAdd.id,
      );
      snackbar.showSuccess(t("common.success"));
      const params =
        currentContext?.id != null ? { contextId: currentContext.id } : undefined;
      const res = await TrackService.list(params);
      setTracks(Array.isArray(res.data) ? res.data : []);
      setAddToTrackDialogOpen(false);
      setFormToAdd(null);
      setSelectedTrackId(null);
      setSelectedSectionId(null);
    } catch (err) {
      console.error("Erro ao adicionar formulário à trilha:", err);
      snackbar.showError(t("forms.errorLoading"));
    } finally {
      setAddingToTrack(false);
    }
  };

  const columns: Column<Form>[] = [
    {
      id: "id",
      label: "ID",
      minWidth: 80,
      mobileLabel: "ID",
      render: (row) => row.id.toString(),
    },
    {
      id: "title",
      label: t("forms.name"),
      minWidth: 200,
      mobileLabel: t("forms.name"),
      render: (row) => row.title,
    },
    {
      id: "description",
      label: t("forms.description"),
      minWidth: 250,
      mobileLabel: t("forms.description"),
      render: (row) => row.description || "-",
    },
    {
      id: "active",
      label: t("forms.status"),
      minWidth: 100,
      mobileLabel: t("forms.status"),
      render: (row) => (
        <Chip
          label={row.active ? t("forms.active") : t("forms.inactive")}
          color={row.active ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      id: "actions",
      label: t("forms.actions"),
      minWidth: 220,
      align: "left",
      render: (row) => {
        const isInactive = row.active === false;
        return (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start" }}>
            <IconButton
              size="small"
              onClick={() => handlePreview(row)}
              title={t("forms.preview")}
              color="success"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => navigate(`/forms/${row.id}`)}
              title={t("common.edit")}
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleAddToTrack(row)}
              title={t("quizzes.forms.addToTrack")}
              color="secondary"
              disabled={isInactive}
            >
              <PlaylistAddIcon fontSize="small" />
            </IconButton>
            {row.active && (
              <IconButton
                size="small"
                onClick={() => handleDeleteClick(row)}
                title={t("common.delete")}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      },
    },
  ];

  const filters = [
    ...(activeFilter !== undefined
      ? [
          {
            label: t("forms.status"),
            value: activeFilter ? t("forms.active") : t("forms.inactive"),
            onDelete: () => setActiveFilter(undefined),
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={t("forms.errorLoading")} />;
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">{t("quizzes.forms.title")}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/forms/new?type=quiz")}
        >
          {t("quizzes.forms.newQuizForm")}
        </Button>
      </Box>

      <Stack spacing={2} sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant={activeFilter === true ? "contained" : "outlined"}
            size="small"
            onClick={() =>
              setActiveFilter(activeFilter === true ? undefined : true)
            }
          >
            {t("forms.active")}
          </Button>
          <Button
            variant={activeFilter === false ? "contained" : "outlined"}
            size="small"
            onClick={() =>
              setActiveFilter(activeFilter === false ? undefined : false)
            }
          >
            {t("forms.inactive")}
          </Button>
        </Box>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setPage(1);
          }}
        />

        <DataTable
          columns={columns}
          data={data?.data || []}
          page={page}
          pageSize={pageSize}
          totalItems={data?.meta.totalItems || 0}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={isLoading}
          variant="table"
        />
      </Stack>

      {/* Dialog de preview */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t("forms.preview")}</DialogTitle>
        <DialogContent>
          {formToPreview && formToPreview.latestVersion && (
            <FormPreview definition={formToPreview.latestVersion.definition} />
          )}
          {formToPreview && !formToPreview.latestVersion && (
            <Typography>Nenhuma versão disponível para preview</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            {t("common.close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de adicionar à trilha */}
      <Dialog
        open={addToTrackDialogOpen}
        onClose={() => setAddToTrackDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adicionar Quiz à Trilha</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
            {formToAdd?.title}
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="quiz-add-track-select-label">Trilha</InputLabel>
            <Select
              labelId="quiz-add-track-select-label"
              value={selectedTrackId ?? ""}
              label="Trilha"
              onChange={(e) => {
                setSelectedTrackId(Number(e.target.value));
                setSelectedSectionId(null);
              }}
            >
              {tracks.map((track: { id: number; name: string }) => (
                <MenuItem key={track.id} value={track.id}>
                  {track.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedTrackId != null && (
            <FormControl fullWidth>
              <InputLabel id="quiz-add-section-select-label">Seção</InputLabel>
              <Select
                labelId="quiz-add-section-select-label"
                value={selectedSectionId ?? ""}
                label="Seção"
                onChange={(e) => setSelectedSectionId(Number(e.target.value))}
              >
                {tracks
                  .find((tr) => tr.id === selectedTrackId)
                  ?.section?.map((section: { id: number; name: string }) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddToTrackDialogOpen(false);
              setFormToAdd(null);
              setSelectedTrackId(null);
              setSelectedSectionId(null);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirmAddToTrack}
            variant="contained"
            disabled={
              !selectedTrackId || !selectedSectionId || addingToTrack
            }
          >
            {addingToTrack ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t("forms.deleteConfirm")}
        message={
          formToDelete
            ? t("forms.deleteMessage", { title: formToDelete.title })
            : ""
        }
        confirmText={t("forms.deleteButton")}
        cancelText={t("common.cancel")}
        onConfirm={handleConfirmDeleteForm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setFormToDelete(null);
        }}
        loading={deleteFormMutation.isPending}
      />
    </Box>
  );
}
