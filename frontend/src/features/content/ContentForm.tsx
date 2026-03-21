import { useEffect, useState, useRef } from "react";
import { ContentService } from "../../api/services/content.service";
import {
  ContentTypeService,
  ContentTypeAdminService,
} from "../../api/services/content-type.service";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrentContext } from "../../contexts/CurrentContextContext";
import TagSelector from "../../../src/components/common/TagSelector";
import Quill from "quill";
import "quill/dist/quill.snow.css";

/** Gera slug URL a partir do título (minúsculas, sem acentos, hífens). */
function titleToSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Função para converter URL de vídeo em embed
const convertVideoUrlToEmbed = (url: string): string => {
  // YouTube
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }

  return url;
};
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useSnackbar } from "../../hooks/useSnackbar";
import { useTranslation } from "react-i18next";
import MobilePreviewDialog from "../../components/common/MobilePreviewDialog";
import ContentQuizManager from "../content-quiz/components/ContentQuizManager";
import ContentTrackManager from "./components/ContentTrackManager";
import type { ContentType } from "../../types/content-type.types";

export default function ContentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentContext } = useCurrentContext();

  const [slugError, setSlugError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [openNewContentTypeDialog, setOpenNewContentTypeDialog] =
    useState(false);
  const [newContentTypeName, setNewContentTypeName] = useState("");
  const [newContentTypeColor, setNewContentTypeColor] = useState("");
  const [editingContentTypeId, setEditingContentTypeId] = useState<
    number | null
  >(null);
  const [editingContentTypeName, setEditingContentTypeName] = useState("");
  const [editingContentTypeColor, setEditingContentTypeColor] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  /** Se true, o slug foi editado manualmente e deixa de seguir o título. */
  const slugUserEditedRef = useRef(!!id);

  useEffect(() => {
    slugUserEditedRef.current = !!id;
  }, [id]);

  const [form, setForm] = useState({
    title: "",
    reference: "",
    content: "",
    thumbnail_url: null as string | null,
    summary: "",
    slug: "",
    author_id: 1,
    context_id: currentContext?.id ?? 0,
    type_id: null as number | null,
    tags: [] as number[],
  });

  // LOAD CONTENT TYPES ON MOUNT
  useEffect(() => {
    ContentTypeService.list()
      .then((res) => {
        console.log("Content types loaded:", res.data);
        setContentTypes(res.data);
      })
      .catch((error) => {
        console.error("Erro ao carregar tipos de conteúdo:", error);
      });
  }, []);

  // INITIALIZE QUILL EDITOR
  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            ["link", "image", "video"],
            ["clean"],
          ],
        },
        placeholder: "Digite ou cole aqui o conteúdo...",
      });

      // Interceptar inserção de vídeo para converter URLs em embeds
      const toolbar = quillRef.current.getModule("toolbar") as any;
      toolbar.addHandler("video", () => {
        const range = quillRef.current?.getSelection();
        if (range) {
          const url = prompt("Digite a URL do vídeo do YouTube):");
          if (url) {
            const embedHtml = convertVideoUrlToEmbed(url);
            if (embedHtml !== url) {
              // É um embed, insere como HTML
              quillRef.current?.clipboard.dangerouslyPasteHTML(
                range.index,
                embedHtml,
              );
            } else {
              // Não é uma URL conhecida, insere como link normal
              quillRef.current?.insertEmbed(range.index, "video", url);
            }
          }
        }
      });

      quillRef.current.on("text-change", () => {
        if (quillRef.current) {
          const html = quillRef.current.root.innerHTML;
          setForm((prev) => ({ ...prev, content: html }));
        }
      });
    }
  }, []);

  // Atualiza o context_id quando o contexto selecionado muda (apenas para criação, não edição)
  useEffect(() => {
    if (!id && currentContext?.id) {
      setForm((prev) => ({ ...prev, context_id: currentContext.id }));
    }
  }, [currentContext?.id, id]);

  useEffect(() => {
    if (id) {
      ContentService.get(Number(id)).then((res) => {
        const c = res.data;
        setForm({
          title: c.title,
          reference: c.reference,
          content: c.content,
          thumbnail_url: c.thumbnail_url || null,
          summary: c.summary,
          slug: c.slug,
          author_id: c.author_id,
          context_id: c.context_id,
          type_id: c.type_id || null,
          tags: c.content_tag?.map((t: any) => t.tag.id) || [],
        });

        // Atualizar o editor Quill com o conteúdo carregado
        if (quillRef.current && c.content) {
          quillRef.current.root.innerHTML = c.content;
        }
      });
    }
  }, [id]);

  const handleCreateNewContentType = async () => {
    if (!newContentTypeName.trim()) {
      snackbar.showError("Nome do tipo de conteúdo é obrigatório");
      return;
    }

    try {
      const newType = await ContentTypeAdminService.create({
        name: newContentTypeName,
        color: newContentTypeColor || undefined,
      });

      setContentTypes([...contentTypes, newType.data]);
      setForm({ ...form, type_id: newType.data.id });
      setNewContentTypeName("");
      setNewContentTypeColor("");
      setOpenNewContentTypeDialog(false);
      snackbar.showSuccess("Tipo de conteúdo criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar tipo de conteúdo:", error);
      snackbar.showError("Erro ao criar tipo de conteúdo");
    }
  };

  const handleDeleteContentType = async (typeId: number) => {
    const confirmed = window.confirm(
      "Deseja excluir este tipo de conteúdo? Ele será desativado.",
    );
    if (!confirmed) return;

    try {
      await ContentTypeAdminService.delete(typeId);
      setContentTypes((prev) => prev.filter((type) => type.id !== typeId));
      setForm((prev) => ({
        ...prev,
        type_id: prev.type_id === typeId ? null : prev.type_id,
      }));
      snackbar.showSuccess("Tipo de conteúdo excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir tipo de conteúdo:", error);
      snackbar.showError("Erro ao excluir tipo de conteúdo");
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
      const updated = await ContentTypeAdminService.update(
        editingContentTypeId,
        {
          name: editingContentTypeName.trim(),
          color: editingContentTypeColor || undefined,
        },
      );

      setContentTypes((prev) =>
        prev.map((type) =>
          type.id === editingContentTypeId ? updated.data : type,
        ),
      );
      snackbar.showSuccess("Tipo de conteúdo atualizado com sucesso!");
      handleCancelEditContentType();
    } catch (error) {
      console.error("Erro ao atualizar tipo de conteúdo:", error);
      snackbar.showError("Erro ao atualizar tipo de conteúdo");
    }
  };

  function validateSlug(value: string) {
    const isValid = /^[a-zA-Z0-9-]+$/.test(value);
    setSlugError(
      isValid ? "" : "O slug não pode conter espaços ou caracteres especiais.",
    );
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    slugUserEditedRef.current = true;
    const value = e.target.value;
    setForm((prev) => ({ ...prev, slug: value }));
    validateSlug(value);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    if (slugUserEditedRef.current) {
      setForm((prev) => ({ ...prev, title }));
      return;
    }
    const slug = titleToSlug(title);
    validateSlug(slug);
    setForm((prev) => ({ ...prev, title, slug }));
  }

  function handleThumbnailFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      snackbar.showError("Selecione um arquivo de imagem válido");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        thumbnail_url: typeof reader.result === "string" ? reader.result : null,
      }));
    };
    reader.onerror = () => {
      snackbar.showError("Erro ao ler a imagem selecionada");
    };
    reader.readAsDataURL(selectedFile);
  }

  function handleRemoveThumbnail() {
    setForm((prev) => ({ ...prev, thumbnail_url: null }));
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  }

  function handleSubmit() {
    if (slugError) return;

    if (id) {
      // Edição
      ContentService.update(Number(id), form)
        .then(() => {
          snackbar.showSuccess("Conteúdo atualizado com sucesso!");
          navigate("/contents");
        })
        .catch((error) => {
          const response = error.response;
          const problemDetails = response?.data;

          if (
            response?.status === 409 &&
            problemDetails?.type === "/errors/unique-constraint"
          ) {
            const field = problemDetails.field || "generic";
            const translationKey = `errors.uniqueConstraint.${field}`;
            const errorMessage = t(translationKey, {
              defaultValue: t("errors.uniqueConstraint.generic"),
            });

            snackbar.showError(errorMessage);
            setSlugError(errorMessage);
          } else {
            snackbar.showError(
              problemDetails?.detail ||
                problemDetails?.message ||
                "Erro ao atualizar conteúdo",
            );
          }
        });
    } else {
      // Criação
      const newContent = {
        ...form,
        reference: form.reference || `ref-${Date.now()}`, // se reference vazio, cria um único
      };

      ContentService.create(newContent)
        .then(() => {
          snackbar.showSuccess("Conteúdo criado com sucesso!");
          navigate("/contents");
        })
        .catch((error) => {
          const response = error.response;
          const problemDetails = response?.data;

          if (
            response?.status === 409 &&
            problemDetails?.type === "/errors/unique-constraint"
          ) {
            const field = problemDetails.field || "generic";
            const translationKey = `errors.uniqueConstraint.${field}`;
            const errorMessage = t(translationKey, {
              defaultValue: t("errors.uniqueConstraint.generic"),
            });

            snackbar.showError(errorMessage);
            setSlugError(errorMessage);
          } else {
            snackbar.showError(
              problemDetails?.detail ||
                problemDetails?.message ||
                "Erro ao criar conteúdo",
            );
          }
        });
    }
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: "1200px",
        mx: "auto",
        width: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
        <IconButton
          onClick={() => navigate("/contents")}
          sx={{ mr: 2 }}
          aria-label="voltar"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {id ? "Editar Conteúdo" : "Criar Conteúdo"}
        </Typography>
      </Box>

      {/* TÍTULO, SLUG E TIPO */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        <TextField
          label="Título *"
          placeholder="Digite o título do conteúdo"
          fullWidth
          margin="normal"
          value={form.title}
          onChange={handleTitleChange}
        />

        <TextField
          label="Slug *"
          placeholder="Digite o slug desejado para a página"
          fullWidth
          margin="normal"
          value={form.slug}
          onChange={handleSlugChange}
          error={!!slugError}
          helperText={slugError}
        />

        <Box>
          <FormControl fullWidth margin="normal" variant="outlined">
            <InputLabel>Tipo de Conteúdo</InputLabel>
            <Select
              value={form.type_id || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  type_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              label="Tipo de Conteúdo"
            >
              <MenuItem value="">Nenhum</MenuItem>
              {contentTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {user && (
            <Button
              variant="text"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setOpenNewContentTypeDialog(true)}
              sx={{ mt: 1 }}
            >
              Editar / criar tipo
            </Button>
          )}
        </Box>
      </Box>

      {/* RESUMO */}
      <TextField
        label="Resumo"
        placeholder="Resumo do conteúdo"
        fullWidth
        margin="normal"
        multiline
        rows={2}
        sx={{ mb: 3 }}
        value={form.summary}
        onChange={(e) => setForm({ ...form, summary: e.target.value })}
      />

      {/* THUMBNAIL */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Thumbnail
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Button component="label" variant="outlined">
            {form.thumbnail_url ? "Alterar thumbnail" : "Adicionar thumbnail"}
            <input
              ref={thumbnailInputRef}
              hidden
              accept="image/*"
              type="file"
              onChange={handleThumbnailFileChange}
            />
          </Button>
          {form.thumbnail_url && (
            <Button
              color="error"
              variant="text"
              onClick={handleRemoveThumbnail}
            >
              Remover thumbnail
            </Button>
          )}
        </Box>

        {form.thumbnail_url && (
          <Box
            component="img"
            src={form.thumbnail_url}
            alt="Preview da thumbnail"
            sx={{
              mt: 2,
              width: "100%",
              maxWidth: 320,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              objectFit: "cover",
            }}
          />
        )}
      </Box>

      {/* CONTEÚDO */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Conteúdo *
        </Typography>
        <Box
          ref={editorRef}
          sx={{
            backgroundColor: "white",
            minHeight: "400px",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            "& .ql-toolbar": {
              position: "sticky",
              top: 0,
              zIndex: 1000,
              backgroundColor: "white",
              borderBottom: "1px solid",
              borderColor: "divider",
            },
            "& .ql-container": {
              minHeight: "350px",
              maxHeight: "600px",
              overflowY: "auto",
            },
          }}
        />
      </Box>

      {/* TAGS */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Tags
        </Typography>
        <TagSelector
          value={form.tags}
          onChange={(newTags: number[]) => setForm({ ...form, tags: newTags })}
        />
      </Box>

      {/* QUIZES ASSOCIADOS - Apenas na edição */}
      {id && (
        <Box sx={{ mb: 4 }}>
          <ContentQuizManager contentId={Number(id)} />
        </Box>
      )}

      {/* TRILHAS ASSOCIADAS - Apenas na edição */}
      {id && (
        <Box sx={{ mb: 4 }}>
          <ContentTrackManager contentId={Number(id)} />
        </Box>
      )}

      {/* BOTÕES */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          justifyContent: { xs: "center", sm: "flex-end" },
          mt: 4,
          pt: 3,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          variant="outlined"
          startIcon={<VisibilityIcon />}
          onClick={() => setPreviewOpen(true)}
          sx={{ minWidth: 120 }}
        >
          Preview
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!!slugError}
          sx={{ minWidth: 120 }}
        >
          {id ? "Salvar" : "Criar"}
        </Button>
      </Box>

      {/* MOBILE PREVIEW DIALOG */}
      <MobilePreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={form.title || "Sem título"}
        htmlContent={form.content}
      />

      {/* NEW CONTENT TYPE DIALOG */}
      <Dialog
        open={openNewContentTypeDialog}
        onClose={() => setOpenNewContentTypeDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Criar Novo Tipo de Conteúdo</DialogTitle>
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
          <Button onClick={() => setOpenNewContentTypeDialog(false)}>
            Cancelar
          </Button>
          {editingContentTypeId === null && (
            <Button onClick={handleCreateNewContentType} variant="contained">
              Criar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* MOBILE PREVIEW DIALOG */}
      <MobilePreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={form.title || "Sem título"}
        htmlContent={form.content}
      />
    </Box>
  );
}
