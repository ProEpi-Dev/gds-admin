import { useEffect, useMemo, useState } from "react";
import { ContentService } from "../../api/services/content.service";
import { useCurrentContext } from "../../contexts/CurrentContextContext";
import {
  ContentTypeService,
  ContentTypeAdminService,
} from "../../api/services/content-type.service";
import { TrackService } from "../../api/services/track.service";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../../hooks/useSnackbar";
import { getErrorMessage } from "../../utils/errorHandler";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  TextField,
  FormControlLabel,
  Switch,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteForever as DeleteForeverIcon,
  RestoreFromTrash as RestoreFromTrashIcon,
  PlaylistAdd as PlaylistAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import DataTable, { type Column } from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import MobilePreviewDialog from "../../components/common/MobilePreviewDialog";
import FilterChips from "../../components/common/FilterChips";
import type { ContentType } from "../../types/content-type.types";

interface Content {
  id: number;
  title: string;
  slug: string;
  content: string;
  active?: boolean;
  content_tag?: Array<{ id: number; tag: { name: string; color?: string } }>;
  content_type?: {
    id: number;
    name: string;
    color?: string;
  } | null;
  /** Sequências da trilha que referenciam este conteúdo (vem do GET /contents). */
  sequence?: Array<{
    id: number;
    section?: { track?: { id: number; name: string; active: boolean } };
  }>;
  /** Se true, oculto da listagem do app para participantes (painel/admin vê sempre). */
  track_exclusive?: boolean;
  /** Associações conteúdo–quiz ativas (vem do GET /contents). */
  content_quiz?: Array<{
    id: number;
    form_id?: number;
    formId?: number;
    display_order?: number;
    displayOrder?: number;
    active?: boolean;
    form?: { id: number; title: string; active?: boolean } | null;
  }>;
}

type TrackChip = { id: number; name: string; active: boolean };

/** Quizzes associados ao conteúdo, na ordem de exibição configurada. */
function linkedQuizzesForRow(content: Content) {
  const raw =
    content.content_quiz ??
    (content as { content_quizzes?: NonNullable<Content["content_quiz"]> })
      .content_quizzes;
  return [...(raw ?? [])]
    .filter((cq) => cq.active !== false)
    .map((cq) => {
      const formId = cq.form_id ?? cq.formId ?? cq.form?.id ?? 0;
      const order = cq.display_order ?? cq.displayOrder ?? 0;
      return {
        id: cq.id,
        order,
        title: (cq.form?.title ?? "").trim() || `Quiz #${formId}`,
        formActive: cq.form?.active !== false,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map(({ id, title, formActive }) => ({ id, title, formActive }));
}

/** Extrai trilhas a partir do include `sequence` do GET /contents (quando presente). */
function tracksFromContentSequences(content: Content): TrackChip[] {
  const map = new Map<number, TrackChip>();
  const raw = content.sequence ?? (content as { sequences?: typeof content.sequence }).sequences;
  for (const seq of raw ?? []) {
    const section = seq.section as
      | { track?: { id: number; name: string; active?: boolean } }
      | undefined;
    const t = section?.track;
    if (t) {
      map.set(t.id, {
        id: t.id,
        name: t.name,
        active: t.active !== false,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
}

/**
 * Fallback: mesma lógica do ContentTrackManager — varre a lista de trilhas do contexto
 * (útil se a API ainda não trouxer `sequence` no conteúdo ou payload diferir).
 */
function tracksFromTrackListForContent(
  contentId: number,
  tracksList: Array<{
    id: number;
    name: string;
    active?: boolean;
    section?: Array<{
      sequence?: Array<{ content_id?: number }>;
    }>;
  }>,
): TrackChip[] {
  const map = new Map<number, TrackChip>();
  for (const track of tracksList) {
    for (const section of track.section ?? []) {
      for (const seq of section.sequence ?? []) {
        if (seq.content_id === contentId) {
          map.set(track.id, {
            id: track.id,
            name: track.name,
            active: track.active !== false,
          });
          break;
        }
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
}

function distinctTracksForContentRow(
  content: Content,
  tracksList: Array<{
    id: number;
    name: string;
    active?: boolean;
    section?: Array<{ sequence?: Array<{ content_id?: number }> }>;
  }>,
): TrackChip[] {
  const fromApi = tracksFromContentSequences(content);
  if (fromApi.length > 0) return fromApi;
  return tracksFromTrackListForContent(content.id, tracksList);
}

export default function ContentList() {
  const { currentContext } = useCurrentContext();
  const [contents, setContents] = useState<Content[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [nameFilter, setNameFilter] = useState("");
  const [contentTypeDialogOpen, setContentTypeDialogOpen] = useState(false);
  const [newContentTypeName, setNewContentTypeName] = useState("");
  const [newContentTypeColor, setNewContentTypeColor] = useState("");
  const [editingContentTypeId, setEditingContentTypeId] = useState<
    number | null
  >(null);
  const [editingContentTypeName, setEditingContentTypeName] = useState("");
  const [editingContentTypeColor, setEditingContentTypeColor] = useState("");
  const [previewContent, setPreviewContent] = useState<Content | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<number | null>(null);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [contentToReactivate, setContentToReactivate] = useState<number | null>(
    null,
  );
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] =
    useState(false);
  const [contentToPermanentDelete, setContentToPermanentDelete] = useState<
    number | null
  >(null);
  const [permanentDeleteLoading, setPermanentDeleteLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showInactive, setShowInactive] = useState(false);
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  // Add to track dialog
  const [addToTrackDialogOpen, setAddToTrackDialogOpen] = useState(false);
  const [contentToAdd, setContentToAdd] = useState<Content | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null,
  );

  const refreshContents = async () => {
    const res = await ContentService.list(
      currentContext?.id,
      showInactive,
    );
    setContents(res.data ?? []);
  };

  const refreshContentTypes = async () => {
    const activeRes = await ContentTypeService.list();
    setContentTypes(activeRes.data);
  };

  useEffect(() => {
    refreshContentTypes();
  }, []);

  useEffect(() => {
    if (currentContext?.id == null) {
      setTracks([]);
      return;
    }
    TrackService.list({ contextId: currentContext.id }).then((res) => {
      setTracks(res.data ?? []);
    });
  }, [currentContext?.id]);

  useEffect(() => {
    if (currentContext?.id == null) {
      setContents([]);
      return;
    }
    refreshContents();
  }, [currentContext?.id, showInactive]);

  useEffect(() => {
    setPage(1);
  }, [showInactive]);

  useEffect(() => {
    setPage(1);
  }, [contentTypeFilter]);

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  const filteredContents = useMemo(() => {
    let list = contents;
    if (contentTypeFilter === "none") {
      list = list.filter((content) => !content.content_type);
    } else if (contentTypeFilter !== "all") {
      const typeId = Number(contentTypeFilter);
      list = list.filter((content) => content.content_type?.id === typeId);
    }
    const q = nameFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q),
      );
    }
    return list;
  }, [contents, contentTypeFilter, nameFilter]);

  const activeFilters = [
    ...(contentTypeFilter !== "all"
      ? [
          {
            label: "Tipo",
            value:
              contentTypeFilter === "none"
                ? "Sem tipo"
                : (contentTypes.find(
                    (type) => type.id === Number(contentTypeFilter),
                  )?.name ?? "Tipo"),
            onDelete: () => setContentTypeFilter("all"),
          },
        ]
      : []),
    ...(nameFilter.trim()
      ? [
          {
            label: "Busca",
            value: nameFilter.trim(),
            onDelete: () => setNameFilter(""),
          },
        ]
      : []),
  ];

  const handleDelete = (id: number) => {
    setContentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleAddToTrack = (content: Content) => {
    setContentToAdd(content);
    setAddToTrackDialogOpen(true);
  };

  const confirmAddToTrack = async () => {
    if (!contentToAdd || !selectedTrackId || !selectedSectionId) return;

    try {
      await TrackService.addContentToSection(
        selectedTrackId,
        selectedSectionId,
        contentToAdd.id,
      );

      // Mostrar notificação de sucesso
      snackbar.showSuccess("Conteúdo adicionado à trilha com sucesso!");

      const [contentsRes, tracksRes] = await Promise.all([
        ContentService.list(currentContext?.id, showInactive),
        TrackService.list(
          currentContext?.id != null
            ? { contextId: currentContext.id }
            : undefined,
        ),
      ]);
      setContents(contentsRes.data ?? []);
      setTracks(tracksRes.data ?? []);

      setAddToTrackDialogOpen(false);
      setContentToAdd(null);
      setSelectedTrackId(null);
      setSelectedSectionId(null);
    } catch (error) {
      console.error("Erro ao adicionar conteúdo à trilha:", error);
      snackbar.showError("Erro ao adicionar conteúdo à trilha");
    }
  };

  const confirmDelete = async () => {
    if (!contentToDelete) return;

    const id = contentToDelete;
    try {
      await ContentService.delete(id, currentContext?.id);
      await refreshContents();
      setDeleteDialogOpen(false);
      setContentToDelete(null);
      snackbar.showSuccess("Conteúdo desativado com sucesso.");
    } catch (error) {
      console.error("Erro ao desativar conteúdo:", error);
      snackbar.showError(
        getErrorMessage(error, "Não foi possível desativar o conteúdo."),
      );
    }
  };

  const confirmReactivate = async () => {
    if (contentToReactivate == null) return;
    const id = contentToReactivate;
    try {
      await ContentService.reactivate(id, currentContext?.id);
      await refreshContents();
      setReactivateDialogOpen(false);
      setContentToReactivate(null);
      snackbar.showSuccess("Conteúdo reativado com sucesso.");
    } catch (error) {
      console.error("Erro ao reativar conteúdo:", error);
      snackbar.showError(
        getErrorMessage(error, "Não foi possível reativar o conteúdo."),
      );
    }
  };

  const confirmPermanentDelete = async () => {
    if (contentToPermanentDelete == null) return;
    const id = contentToPermanentDelete;
    setPermanentDeleteLoading(true);
    try {
      await ContentService.permanentDelete(id, currentContext?.id);
      setContents((prev) => prev.filter((c) => c.id !== id));
      setPermanentDeleteDialogOpen(false);
      setContentToPermanentDelete(null);
      snackbar.showSuccess("Conteúdo excluído permanentemente.");
    } catch (error) {
      console.error("Erro ao excluir conteúdo permanentemente:", error);
      snackbar.showError(
        getErrorMessage(
          error,
          "Não foi possível excluir o conteúdo permanentemente.",
        ),
      );
    } finally {
      setPermanentDeleteLoading(false);
    }
  };

  const handleCreateContentType = async () => {
    if (!newContentTypeName.trim()) {
      snackbar.showError("Nome do tipo de conteúdo é obrigatório");
      return;
    }

    try {
      await ContentTypeAdminService.create({
        name: newContentTypeName.trim(),
        color: newContentTypeColor || undefined,
      });
      setNewContentTypeName("");
      setNewContentTypeColor("");
      await refreshContentTypes();
      await refreshContents();
      snackbar.showSuccess("Tipo de conteúdo criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar tipo de conteúdo:", error);
      snackbar.showError("Erro ao criar tipo de conteúdo");
    }
  };

  const handleStartEditContentType = (type: ContentType) => {
    setEditingContentTypeId(type.id);
    setEditingContentTypeName(type.name);
    setEditingContentTypeColor(type.color || "");
  };

  const handleCancelEditContentType = () => {
    setEditingContentTypeId(null);
    setEditingContentTypeName("");
    setEditingContentTypeColor("");
  };

  const handleSaveEditContentType = async () => {
    if (!editingContentTypeId) return;
    if (!editingContentTypeName.trim()) {
      snackbar.showError("Nome do tipo de conteúdo é obrigatório");
      return;
    }

    try {
      await ContentTypeAdminService.update(editingContentTypeId, {
        name: editingContentTypeName.trim(),
        color: editingContentTypeColor || undefined,
      });
      await refreshContentTypes();
      await refreshContents();
      snackbar.showSuccess("Tipo de conteúdo atualizado com sucesso!");
      handleCancelEditContentType();
    } catch (error) {
      console.error("Erro ao atualizar tipo de conteúdo:", error);
      snackbar.showError("Erro ao atualizar tipo de conteúdo");
    }
  };

  const handleDeleteContentType = async (typeId: number) => {
    const confirmed = window.confirm(
      "Deseja excluir este tipo de conteúdo? Ele será desativado.",
    );
    if (!confirmed) return;

    try {
      await ContentTypeAdminService.delete(typeId);
      await refreshContentTypes();
      await refreshContents();

      if (contentTypeFilter === String(typeId)) {
        setContentTypeFilter("all");
      }

      snackbar.showSuccess("Tipo de conteúdo excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir tipo de conteúdo:", error);
      snackbar.showError("Erro ao excluir tipo de conteúdo");
    }
  };

  const columns: Column<Content>[] = [
    { id: "id", label: "ID", minWidth: 70 },
    { id: "title", label: "Título", minWidth: 200 },
    {
      id: "status",
      label: "Situação",
      minWidth: 110,
      render: (row) =>
        row.active === false ? (
          <Chip label="Inativo" size="small" color="default" variant="outlined" />
        ) : (
          <Chip label="Ativo" size="small" color="success" variant="outlined" />
        ),
    },
    { id: "slug", label: "Slug", minWidth: 150 },
    {
      id: "track_exclusive",
      label: "Exclusivo trilhas",
      minWidth: 130,
      render: (row) =>
        row.track_exclusive ? (
          <Chip label="Só trilha" size="small" color="info" variant="outlined" />
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      id: "quizzes",
      label: "Quizes",
      minWidth: 200,
      render: (row) => {
        const qs = linkedQuizzesForRow(row);
        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {qs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            ) : (
              qs.map((q) => (
                <Chip
                  key={q.id}
                  label={q.title}
                  size="small"
                  variant={q.formActive ? "filled" : "outlined"}
                  color={q.formActive ? "primary" : "default"}
                  sx={{ fontSize: 12 }}
                />
              ))
            )}
          </Box>
        );
      },
    },
    {
      id: "tracks",
      label: "Trilhas",
      minWidth: 200,
      render: (row) => {
        const rowTracks = distinctTracksForContentRow(row, tracks);
        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {rowTracks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            ) : (
              rowTracks.map((t) => (
                <Chip
                  key={t.id}
                  label={t.name}
                  size="small"
                  variant={t.active ? "filled" : "outlined"}
                  color={t.active ? "secondary" : "default"}
                  sx={{ fontSize: 12 }}
                />
              ))
            )}
          </Box>
        );
      },
    },
    {
      id: "actions",
      label: "Ações",
      minWidth: 220,
      align: "left",
      render: (row) => {
        const isInactive = row.active === false;
        return (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start" }}>
            <IconButton
              size="small"
              onClick={() => setPreviewContent(row)}
              title="Preview"
              color="success"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => navigate(`/contents/${row.id}/edit`)}
              title="Editar"
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleAddToTrack(row)}
              title="Adicionar à Trilha"
              color="secondary"
              disabled={isInactive}
            >
              <PlaylistAddIcon fontSize="small" />
            </IconButton>
            {!isInactive && (
              <IconButton
                size="small"
                onClick={() => handleDelete(row.id)}
                title="Desativar (exclusão lógica)"
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            {isInactive && (
              <>
                <IconButton
                  size="small"
                  onClick={() => {
                    setContentToReactivate(row.id);
                    setReactivateDialogOpen(true);
                  }}
                  title="Reativar"
                  color="success"
                >
                  <RestoreFromTrashIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    setContentToPermanentDelete(row.id);
                    setPermanentDeleteDialogOpen(true);
                  }}
                  title="Excluir permanentemente"
                  color="error"
                >
                  <DeleteForeverIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
        );
      },
    },
  ];

  // Função para exportar CSV
  const handleExportCSV = () => {
    if (!filteredContents || filteredContents.length === 0) return;

    // Cabeçalhos das colunas
    const headers = [
      "ID",
      "Título",
      "Situação",
      "Slug",
      "Exclusivo trilhas",
      "Quizes",
      "Trilhas",
    ];

    // Linhas de dados
    const rows = filteredContents.map((item) => {
      const quizes = linkedQuizzesForRow(item)
        .map((q) => q.title)
        .join(", ");
      const trilhas = distinctTracksForContentRow(item, tracks)
        .map((t) => t.name)
        .join(", ");
      const situacao = item.active === false ? "Inativo" : "Ativo";
      const exclusivoTrilhas = item.track_exclusive ? "Sim" : "Não";

      return [
        item.id.toString(),
        item.title.replace(/"/g, '""'),
        situacao,
        item.slug.replace(/"/g, '""'),
        exclusivoTrilhas,
        quizes.replace(/"/g, '""'),
        trilhas.replace(/"/g, '""'),
      ];
    });

    // Construir CSV final
    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    // Criar o blob e iniciar download
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const date = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `conteudos_${date}.csv`);

    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Conteúdos
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          {contents.length > 0 && (
            <Button
              variant="outlined"
              onClick={handleExportCSV}
              color="success"
            >
              Exportar CSV
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/contents/new")}
          >
            Novo Conteúdo
          </Button>
        </Box>
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        mb={2}
        flexWrap="wrap"
        useFlexGap
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          size="small"
          label="Buscar"
          placeholder="Título ou slug"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          sx={{ minWidth: 220, flex: { md: "1 1 260px" }, maxWidth: { md: 420 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Tipo de Conteúdo</InputLabel>
          <Select
            value={contentTypeFilter}
            label="Tipo de Conteúdo"
            onChange={(e) => setContentTypeFilter(String(e.target.value))}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="none">Sem tipo</MenuItem>
            {contentTypes.map((type) => (
              <MenuItem key={type.id} value={String(type.id)}>
                {type.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={() => setContentTypeDialogOpen(true)}
        >
          Gerenciar tipos
        </Button>

        <FormControlLabel
          control={
            <Switch
              checked={showInactive}
              onChange={(_, checked) => setShowInactive(checked)}
              color="primary"
            />
          }
          label="Mostrar inativos"
        />
      </Stack>

      {activeFilters.length > 0 && <FilterChips filters={activeFilters} />}

      <DataTable
        columns={columns}
        data={filteredContents}
        page={page}
        pageSize={pageSize}
        totalItems={filteredContents.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        variant="table"
        emptyMessage="Nenhum conteúdo encontrado"
      />

      {/* MODAL DE PREVIEW MOBILE */}
      <MobilePreviewDialog
        open={!!previewContent}
        onClose={() => setPreviewContent(null)}
        title={previewContent?.title || ""}
        htmlContent={previewContent?.content || ""}
      />

      {/* CONTENT TYPE CRUD DIALOG */}
      <Dialog
        open={contentTypeDialogOpen}
        onClose={() => {
          setContentTypeDialogOpen(false);
          handleCancelEditContentType();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Gerenciar Tipos de Conteúdo</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editingContentTypeId === null && (
            <>
              <TextField
                label="Nome"
                placeholder="Ex: Vídeo, Artigo, Infográfico..."
                fullWidth
                margin="normal"
                value={newContentTypeName}
                onChange={(e) => setNewContentTypeName(e.target.value)}
              />
              <TextField
                label="Cor (Hex)"
                placeholder="Ex: #FF5733"
                fullWidth
                margin="normal"
                value={newContentTypeColor}
                onChange={(e) => setNewContentTypeColor(e.target.value)}
                type="color"
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}

          {contentTypes.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Tipos existentes
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {contentTypes.map((type) => (
                  <Box
                    key={type.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      p: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    {editingContentTypeId === type.id ? (
                      <>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flex: 1,
                          }}
                        >
                          <TextField
                            size="small"
                            label="Nome"
                            value={editingContentTypeName}
                            onChange={(e) =>
                              setEditingContentTypeName(e.target.value)
                            }
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            size="small"
                            label="Cor"
                            type="color"
                            value={editingContentTypeColor || "#000000"}
                            onChange={(e) =>
                              setEditingContentTypeColor(e.target.value)
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 90 }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={handleSaveEditContentType}
                            aria-label={`Salvar tipo ${type.name}`}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleCancelEditContentType}
                            aria-label={`Cancelar edição do tipo ${type.name}`}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Chip
                            label={type.name}
                            size="small"
                            sx={{
                              backgroundColor: type.color || "#e3f2fd",
                              color: "#fff",
                              fontSize: 12,
                            }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleStartEditContentType(type)}
                            aria-label={`Editar tipo ${type.name}`}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteContentType(type.id)}
                            aria-label={`Excluir tipo ${type.name}`}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setContentTypeDialogOpen(false);
              handleCancelEditContentType();
            }}
          >
            Fechar
          </Button>
          {editingContentTypeId === null && (
            <Button onClick={handleCreateContentType} variant="contained">
              Criar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* CONFIRM DELETE DIALOG (soft) */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Desativar conteúdo"
        message='Só é possível desativar se o conteúdo não estiver em trilhas nem tiver quizzes vinculados; caso contrário a API retornará um aviso para remover essas associações. Após desativar, você poderá vê-lo com "Mostrar inativos", reativá-lo ou excluí-lo permanentemente (também sujeito à mesma regra de vínculos).'
        confirmText="Desativar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setContentToDelete(null);
        }}
      />

      <ConfirmDialog
        open={reactivateDialogOpen}
        title="Reativar conteúdo"
        message="O conteúdo voltará a ficar ativo e visível na listagem padrão."
        confirmText="Reativar"
        confirmColor="primary"
        cancelText="Cancelar"
        onConfirm={confirmReactivate}
        onCancel={() => {
          setReactivateDialogOpen(false);
          setContentToReactivate(null);
        }}
      />

      <ConfirmDialog
        open={permanentDeleteDialogOpen}
        title="Excluir permanentemente"
        message="Esta ação não pode ser desfeita. Só é permitida se o conteúdo não estiver em trilhas nem tiver quizzes vinculados; caso contrário o sistema avisará para remover essas associações antes."
        confirmText="Excluir permanentemente"
        cancelText="Cancelar"
        loading={permanentDeleteLoading}
        onConfirm={confirmPermanentDelete}
        onCancel={() => {
          if (!permanentDeleteLoading) {
            setPermanentDeleteDialogOpen(false);
            setContentToPermanentDelete(null);
          }
        }}
      />

      {/* ADD TO TRACK DIALOG */}
      <Dialog
        open={addToTrackDialogOpen}
        onClose={() => setAddToTrackDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adicionar Conteúdo à Trilha</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Adicionando: {contentToAdd?.title}
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="select-track-label">Selecione a Trilha</InputLabel>

            <Select
              labelId="select-track-label"
              label="Selecione a Trilha"
              value={selectedTrackId || ""}
              onChange={(e) => {
                setSelectedTrackId(Number(e.target.value));
                setSelectedSectionId(null);
              }}
            >
              <MenuItem value="">
                <em>Selecione a trilha</em>
              </MenuItem>

              {tracks.map((track) => (
                <MenuItem key={track.id} value={track.id}>
                  {track.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedTrackId && (
            <FormControl fullWidth>
              <InputLabel id="select-section-label">
                Selecione a Seção
              </InputLabel>

              <Select
                labelId="select-section-label"
                label="Selecione a Seção"
                value={selectedSectionId || ""}
                onChange={(e) => setSelectedSectionId(Number(e.target.value))}
              >
                <MenuItem value="">
                  <em>Selecione a seção</em>
                </MenuItem>

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
    </Box>
  );
}
