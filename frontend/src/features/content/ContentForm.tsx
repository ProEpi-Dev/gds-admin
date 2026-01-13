import { useEffect, useState, useRef } from "react";
import { ContentService } from "../../api/services/content.service";
import { useNavigate, useParams } from "react-router-dom";
import TagSelector from "../../../src/components/common/TagSelector";
import Quill from "quill";
import "quill/dist/quill.snow.css";

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
import { Box, Button, TextField, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useSnackbar } from "../../hooks/useSnackbar";
import { useTranslation } from "react-i18next";
import MobilePreviewDialog from "../../components/common/MobilePreviewDialog";
import ContentQuizManager from "../content-quiz/components/ContentQuizManager";
import ContentTrackManager from "./components/ContentTrackManager";

export default function ContentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();

  const [slugError, setSlugError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  const [form, setForm] = useState({
    title: "",
    reference: "",
    content: "",
    summary: "",
    slug: "",
    author_id: 1,
    context_id: 1,
    tags: [] as number[],
  });

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
                embedHtml
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

  useEffect(() => {
    if (id) {
      ContentService.get(Number(id)).then((res) => {
        const c = res.data;
        setForm({
          title: c.title,
          reference: c.reference,
          content: c.content,
          summary: c.summary,
          slug: c.slug,
          author_id: c.author_id,
          context_id: c.context_id,
          tags: c.content_tag?.map((t: any) => t.tag.id) || [],
        });

        // Atualizar o editor Quill com o conteúdo carregado
        if (quillRef.current && c.content) {
          quillRef.current.root.innerHTML = c.content;
        }
      });
    }
  }, [id]);

  function validateSlug(value: string) {
    const isValid = /^[a-zA-Z0-9-]+$/.test(value);
    setSlugError(
      isValid ? "" : "O slug não pode conter espaços ou caracteres especiais."
    );
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setForm({ ...form, slug: value });
    validateSlug(value);
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
                "Erro ao atualizar conteúdo"
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
                "Erro ao criar conteúdo"
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

      {/* TÍTULO E SLUG */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        <TextField
          label="Título"
          placeholder="Digite o título do conteúdo"
          fullWidth
          margin="normal"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <TextField
          label="Slug"
          placeholder="Digite o slug desejado para a página"
          fullWidth
          margin="normal"
          value={form.slug}
          onChange={handleSlugChange}
          error={!!slugError}
          helperText={slugError}
        />
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

      {/* CONTEÚDO */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Conteúdo
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
    </Box>
  );
}
