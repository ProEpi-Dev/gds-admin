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
} from "@mui/icons-material";
import { useForms } from "../../forms/hooks/useForms";
import { TrackService } from "../../../api/services/track.service";
import DataTable, { type Column } from "../../../components/common/DataTable";
import FilterChips from "../../../components/common/FilterChips";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import FormPreview from "../../../components/form-builder/FormPreview";
import { useTranslation } from "../../../hooks/useTranslation";
import type { Form } from "../../../types/form.types";

export default function QuizFormsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(
    undefined
  );
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [formToPreview, setFormToPreview] = useState<Form | null>(null);

  // Add to track dialog
  const [addToTrackDialogOpen, setAddToTrackDialogOpen] = useState(false);
  const [formToAdd, setFormToAdd] = useState<Form | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [addingToTrack, setAddingToTrack] = useState(false);

  // Sempre filtrar apenas formulários do tipo quiz
  const { data, isLoading, error } = useForms({
    page,
    pageSize,
    active: activeFilter,
    type: "quiz", // Filtro fixo para quiz
  });

  // Load tracks when opening the dialog
  useEffect(() => {
    if (addToTrackDialogOpen) {
      TrackService.list()
        .then((res: any) => setTracks(res.data))
        .catch((err: any) => console.error("Erro ao carregar trilhas:", err));
    }
  }, [addToTrackDialogOpen]);

  const handlePreview = (form: Form) => {
    setFormToPreview(form);
    setPreviewDialogOpen(true);
  };

  const handleAddToTrack = (form: Form) => {
    setFormToAdd(form);
    setSelectedTrackId(null);
    setAddToTrackDialogOpen(true);
  };

  const handleConfirmAddToTrack = async () => {
    if (!formToAdd || !selectedTrackId) return;

    setAddingToTrack(true);
    try {
      // Nota: Para adicionar um quiz à trilha, precisaríamos de uma seção específica
      // Por ora, vamos apenas fechar o diálogo com uma mensagem
      alert("Funcionalidade de adicionar quiz à trilha requer seleção de seção. Use a página de trilhas para adicionar conteúdo.");
      setAddToTrackDialogOpen(false);
      setFormToAdd(null);
      setSelectedTrackId(null);
    } catch (err) {
      console.error("Erro ao adicionar formulário à trilha:", err);
      alert("Erro ao adicionar formulário à trilha");
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
      minWidth: 200,
      align: "right",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/forms/${row.id}`)}
            title={t("common.view")}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/form-builder?formId=${row.id}`)}
            title={t("common.edit")}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handlePreview(row)}
            title={t("forms.preview")}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleAddToTrack(row)}
            title="Adicionar à trilha"
          >
            <PlaylistAddIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
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
          onClick={() => navigate("/form-builder?type=quiz")}
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
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Trilha</InputLabel>
            <Select
              value={selectedTrackId || ""}
              label="Trilha"
              onChange={(e) => setSelectedTrackId(Number(e.target.value))}
            >
              {tracks.map((track) => (
                <MenuItem key={track.id} value={track.id}>
                  {track.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddToTrackDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirmAddToTrack}
            variant="contained"
            disabled={!selectedTrackId || addingToTrack}
          >
            {addingToTrack ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
