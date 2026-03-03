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
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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
  content_tag?: Array<{ id: number; tag: { name: string; color?: string } }>;
  content_type?: {
    id: number;
    name: string;
    color?: string;
  } | null;
}

export default function ContentList() {
  const { currentContext } = useCurrentContext();
  const [contents, setContents] = useState<Content[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
    const res = await ContentService.list(currentContext?.id);
    setContents(res.data ?? []);
  };

  const refreshContentTypes = async () => {
    const activeRes = await ContentTypeService.list();
    setContentTypes(activeRes.data);
  };

  useEffect(() => {
    refreshContentTypes();
    TrackService.list().then((res) => {
      setTracks(res.data);
    });
  }, []);

  useEffect(() => {
    if (currentContext?.id == null) {
      setContents([]);
      return;
    }
    refreshContents();
  }, [currentContext?.id]);

  useEffect(() => {
    setPage(1);
  }, [contentTypeFilter]);

  const filteredContents = useMemo(() => {
    if (contentTypeFilter === "all") return contents;
    if (contentTypeFilter === "none") {
      return contents.filter((content) => !content.content_type);
    }
    const typeId = Number(contentTypeFilter);
    return contents.filter((content) => content.content_type?.id === typeId);
  }, [contents, contentTypeFilter]);

  const activeFilters =
    contentTypeFilter !== "all"
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
      : [];

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

      // Refresh tracks data
      const res = await TrackService.list();
      setTracks(res.data);

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
    if (contentToDelete) {
      await ContentService.delete(contentToDelete);
      setContents((prev) => prev.filter((c) => c.id !== contentToDelete));
      setDeleteDialogOpen(false);
      setContentToDelete(null);
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
    { id: "slug", label: "Slug", minWidth: 150 },
    {
      id: "type",
      label: "Tipo",
      minWidth: 130,
      render: (row) =>
        row.content_type ? (
          <Chip
            label={row.content_type.name}
            size="small"
            sx={{
              backgroundColor: row.content_type.color || "#9c27b0",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
            }}
          />
        ) : (
          <Typography variant="caption" color="textSecondary">
            Sem tipo
          </Typography>
        ),
    },
    {
      id: "tags",
      label: "Tags",
      minWidth: 200,
      render: (row) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {row.content_tag?.map((t) => (
            <Chip
              key={t.id}
              label={`#${t.tag.name}`}
              size="small"
              sx={{
                backgroundColor: t.tag.color || "#e3f2fd",
                color: "#fff",
                fontSize: 12,
              }}
            />
          ))}
        </Box>
      ),
    },
    {
      id: "actions",
      label: "Ações",
      minWidth: 150,
      align: "left",
      render: (row) => (
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
          >
            <PlaylistAddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(row.id)}
            title="Excluir"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Função para exportar CSV
  const handleExportCSV = () => {
    if (!filteredContents || filteredContents.length === 0) return;

    // Cabeçalhos das colunas
    const headers = ["ID", "Título", "Slug", "Tipo", "Tags"];

    // Linhas de dados
    const rows = filteredContents.map((item) => {
      const type = item.content_type?.name || "Sem tipo";
      const tags =
        item.content_tag?.map((t) => `#${t.tag.name}`).join(", ") || "";

      return [
        item.id.toString(),
        item.title.replace(/"/g, '""'),
        type.replace(/"/g, '""'),
        item.slug.replace(/"/g, '""'),
        tags.replace(/"/g, '""'),
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
      >
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

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Conteúdo"
        message="Tem certeza que deseja excluir este conteúdo?"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setContentToDelete(null);
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
