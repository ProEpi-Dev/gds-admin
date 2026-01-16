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
import { useForms } from "../hooks/useForms";
import { TrackService } from "../../../api/services/track.service";
import DataTable, { type Column } from "../../../components/common/DataTable";
import FilterChips from "../../../components/common/FilterChips";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import FormPreview from "../../../components/form-builder/FormPreview";
import { useTranslation } from "../../../hooks/useTranslation";
import type { Form } from "../../../types/form.types";

export default function FormsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(
    undefined
  );
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [formToPreview, setFormToPreview] = useState<Form | null>(null);

  // Add to track dialog
  const [addToTrackDialogOpen, setAddToTrackDialogOpen] = useState(false);
  const [formToAdd, setFormToAdd] = useState<Form | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null
  );

  const { data, isLoading, error } = useForms({
    page,
    pageSize,
    active: activeFilter,
    type: typeFilter as "signal" | "quiz" | undefined,
  });

  useEffect(() => {
    TrackService.list().then((res) => {
      setTracks(res.data);
    });
  }, []);

  const handleAddToTrack = (form: Form) => {
    setFormToAdd(form);
    setAddToTrackDialogOpen(true);
  };

  const confirmAddToTrack = async () => {
    if (!formToAdd || !selectedTrackId || !selectedSectionId) return;

    try {
      await TrackService.addFormToSection(
        selectedTrackId,
        selectedSectionId,
        formToAdd.id
      );

      // Refresh tracks data
      const res = await TrackService.list();
      setTracks(res.data);

      setAddToTrackDialogOpen(false);
      setFormToAdd(null);
      setSelectedTrackId(null);
      setSelectedSectionId(null);
    } catch (error) {
      console.error("Erro ao adicionar formulário à trilha:", error);
      // You might want to show an error message to the user here
    }
  };

  const columns: Column<Form>[] = [
    {
      id: "id",
      label: t("forms.id"),
      minWidth: 70,
      mobileLabel: t("forms.id"),
    },
    {
      id: "title",
      label: t("forms.titleField"),
      minWidth: 150,
      mobileLabel: t("forms.titleField"),
    },
    {
      id: "type",
      label: t("forms.type"),
      minWidth: 100,
      mobileLabel: t("forms.type"),
      render: (row) => (
        <Chip
          label={row.type === "signal" ? t("forms.signal") : t("forms.quiz")}
          size="small"
        />
      ),
    },
    {
      id: "contextId",
      label: t("forms.context"),
      minWidth: 100,
      mobileLabel: t("forms.context"),
      render: (row) =>
        row.context?.name || (row.contextId ? `#${row.contextId}` : "-"),
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
      minWidth: 120,
      align: "right",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start" }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/forms/${row.id}`)}
            title="Ver detalhes"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          {row.latestVersion?.definition && (
            <IconButton
              size="small"
              onClick={() => handlePreview(row)}
              title="Preview do Formulário"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => handleAddToTrack(row)}
            title="Adicionar à Trilha"
          >
            <PlaylistAddIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const handlePreview = (form: Form) => {
    setFormToPreview(form);
    setPreviewDialogOpen(true);
  };

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
    ...(typeFilter
      ? [
          {
            label: t("forms.type"),
            value:
              typeFilter === "signal" ? t("forms.signal") : t("forms.quiz"),
            onDelete: () => setTypeFilter(undefined),
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
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 2,
        }}
      >
        <Typography variant="h4">{t("forms.title")}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/forms/new")}
        >
          {t("forms.newForm")}
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
          <Button
            variant={typeFilter === "signal" ? "contained" : "outlined"}
            size="small"
            onClick={() =>
              setTypeFilter(typeFilter === "signal" ? undefined : "signal")
            }
          >
            {t("forms.signal")}
          </Button>
          <Button
            variant={typeFilter === "quiz" ? "contained" : "outlined"}
            size="small"
            onClick={() =>
              setTypeFilter(typeFilter === "quiz" ? undefined : "quiz")
            }
          >
            {t("forms.quiz")}
          </Button>
        </Box>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setTypeFilter(undefined);
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
        />
      </Stack>

      <Dialog
        open={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false);
          setFormToPreview(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Preview: {formToPreview?.title}
          {formToPreview?.latestVersion && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (Versão {formToPreview.latestVersion.versionNumber})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {formToPreview?.latestVersion?.definition ? (
            <FormPreview definition={formToPreview.latestVersion.definition} />
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ py: 4 }}
            >
              Nenhuma versão disponível para preview
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPreviewDialogOpen(false);
              setFormToPreview(null);
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD TO TRACK DIALOG */}
      <Dialog
        open={addToTrackDialogOpen}
        onClose={() => setAddToTrackDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adicionar Formulário à Trilha</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Adicionando: {formToAdd?.title}
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Selecione a Trilha</InputLabel>
            <Select
              value={selectedTrackId || ""}
              onChange={(e) => {
                setSelectedTrackId(Number(e.target.value));
                setSelectedSectionId(null);
              }}
            >
              {tracks.map((track) => (
                <MenuItem key={track.id} value={track.id}>
                  {track.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedTrackId && (
            <FormControl fullWidth>
              <InputLabel>Selecione a Seção</InputLabel>
              <Select
                value={selectedSectionId || ""}
                onChange={(e) => setSelectedSectionId(Number(e.target.value))}
              >
                {tracks
                  .find((t) => t.id === selectedTrackId)
                  ?.section?.map((section: any) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddToTrackDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={confirmAddToTrack}
            disabled={!selectedTrackId || !selectedSectionId}
            variant="contained"
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
