import { useEffect, useState, useRef } from "react";
import { ContentService } from "../../api/services/content.service";
import { useNavigate, useParams } from "react-router-dom";
import TagSelector from "../../../src/components/common/TagSelector";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSnackbar } from "../../hooks/useSnackbar";
import { useTranslation } from "react-i18next";

export default function ContentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();

  const [slugError, setSlugError] = useState("");
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
            ["link", "image"],
            ["clean"],
          ],
        },
        placeholder: "Digite ou cole aqui o conteúdo...",
      });

      // Listener para atualizar o estado quando o conteúdo mudar
      quillRef.current.on("text-change", () => {
        if (quillRef.current) {
          const html = quillRef.current.root.innerHTML;
          setForm((prev) => ({ ...prev, content: html }));
        }
      });
    }
  }, []);

  // LOAD CONTENT IF EDIT
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

  // SLUG VALIDATION
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

  // SUBMIT
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
          
          // Check for RFC 9457 format from PrismaExceptionFilter
          if (response?.status === 409 && problemDetails?.type === '/errors/unique-constraint') {
            // Get translated error message based on field
            const field = problemDetails.field || 'generic';
            const translationKey = `errors.uniqueConstraint.${field}`;
            const errorMessage = t(translationKey, { defaultValue: t('errors.uniqueConstraint.generic') });
            
            snackbar.showError(errorMessage);
            setSlugError(errorMessage);
          } else {
            // Generic error handling
            snackbar.showError(problemDetails?.detail || problemDetails?.message || "Erro ao atualizar conteúdo");
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
          
          // Check for RFC 9457 format from PrismaExceptionFilter
          if (response?.status === 409 && problemDetails?.type === '/errors/unique-constraint') {
            // Get translated error message based on field
            const field = problemDetails.field || 'generic';
            const translationKey = `errors.uniqueConstraint.${field}`;
            const errorMessage = t(translationKey, { defaultValue: t('errors.uniqueConstraint.generic') });
            
            snackbar.showError(errorMessage);
            setSlugError(errorMessage);
          } else {
            // Generic error handling
            snackbar.showError(problemDetails?.detail || problemDetails?.message || "Erro ao criar conteúdo");
          }
        });
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 700 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
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

      {/* TÍTULO */}
      <TextField
        label="Título"
        placeholder="Digite o título do conteúdo"
        fullWidth
        margin="normal"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      {/* SLUG */}
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

      {/* RESUMO */}
      <TextField
        label="Resumo"
        placeholder="Resumo do conteúdo"
        fullWidth
        margin="normal"
        value={form.summary}
        onChange={(e) => setForm({ ...form, summary: e.target.value })}
      />

      {/* CONTEÚDO */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Conteúdo
        </Typography>
        <Box
          ref={editorRef}
          sx={{
            backgroundColor: "white",
            minHeight: "200px",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        />
      </Box>

      {/* TAGS */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Tags
        </Typography>
        <TagSelector
          value={form.tags}
          onChange={(newTags: number[]) => setForm({ ...form, tags: newTags })}
        />
      </Box>

      {/* BOTÃO SUBMIT */}
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!!slugError}
        sx={{ mt: 3 }}
        fullWidth
      >
        {id ? "Salvar" : "Criar"}
      </Button>
    </Box>
  );
}
