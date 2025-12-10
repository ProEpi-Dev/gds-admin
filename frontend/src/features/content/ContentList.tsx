import { useEffect, useState } from "react";
import { ContentService } from "../../api/services/content.service";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import "quill/dist/quill.snow.css";
import "./ContentPreview.css";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogContent,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import DataTable, { type Column } from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";

interface Content {
  id: number;
  title: string;
  slug: string;
  content: string;
  content_tag?: Array<{ id: number; tag: { name: string; color?: string } }>;
}

export default function ContentList() {
  const [contents, setContents] = useState<Content[]>([]);
  const [previewContent, setPreviewContent] = useState<Content | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const navigate = useNavigate();

  useEffect(() => {
    ContentService.list().then((res) => {
      setContents(res.data);
    });
  }, []);

  // Função para processar e sanitizar o HTML
  const processContentHtml = (html: string) => {
    if (!html) return "";
    
    // Remove atributos width e height das imagens
    let processedHtml = html.replace(
      /<img([^>]*?)(?:\s+width="[^"]*"|\s+height="[^"]*")/gi,
      '<img$1'
    );
    
    // Remove estilos inline de width e height das imagens
    processedHtml = processedHtml.replace(
      /<img([^>]*?)style="([^"]*?)"/gi,
      (_match, before, style) => {
        const newStyle = style
          .replace(/width\s*:\s*[^;]+;?/gi, '')
          .replace(/height\s*:\s*[^;]+;?/gi, '');
        return `<img${before}style="${newStyle}"`;
      }
    );
    
    // Sanitiza o HTML com DOMPurify para prevenir XSS
    return DOMPurify.sanitize(processedHtml, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                     'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });
  };

  const handleDelete = (id: number) => {
    setContentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (contentToDelete) {
      await ContentService.delete(contentToDelete);
      setContents((prev) => prev.filter((c) => c.id !== contentToDelete));
      setDeleteDialogOpen(false);
      setContentToDelete(null);
    }
  };

  const columns: Column<Content>[] = [
    { id: "id", label: "ID", minWidth: 70 },
    { id: "title", label: "Título", minWidth: 200 },
    { id: "slug", label: "Slug", minWidth: 150 },
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
      align: "right",
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

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/contents/new")}
        >
          Novo Conteúdo
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={contents}
        page={page}
        pageSize={pageSize}
        totalItems={contents.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        variant="table"
        emptyMessage="Nenhum conteúdo encontrado"
      />

      {/* MODAL DE PREVIEW MOBILE */}
      <Dialog
        open={!!previewContent}
        onClose={() => setPreviewContent(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        }}
      >
        <DialogContent sx={{ p: 0, overflow: "visible" }}>
          <Box
            sx={{
              position: "relative",
              width: "375px",
              height: "667px",
              backgroundColor: "#000",
              borderRadius: "36px",
              padding: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              margin: "0 auto",
            }}
          >
            {/* Notch do celular */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "150px",
                height: "30px",
                backgroundColor: "#000",
                borderRadius: "0 0 20px 20px",
                zIndex: 10,
              }}
            />

            {/* Tela do celular */}
            <Box
              sx={{
                width: "100%",
                height: "100%",
                backgroundColor: "#fff",
                borderRadius: "26px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header do app */}
              <Box
                sx={{
                  backgroundColor: "primary.main",
                  color: "white",
                  padding: "40px 16px 16px 16px",
                  fontSize: "18px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="h6" sx={{ color: "white" }}>
                  {previewContent?.title}
                </Typography>
                <IconButton
                  onClick={() => setPreviewContent(null)}
                  sx={{ color: "white" }}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Conteúdo */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <Box
                  sx={{
                    backgroundColor: "white",
                    borderRadius: "8px",
                    padding: "16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  {/* Renderiza o conteúdo HTML do Quill */}
                  <div
                    className="ql-editor mobile-preview-content"
                    dangerouslySetInnerHTML={{ 
                      __html: processContentHtml(previewContent?.content || "") 
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
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
    </Box>
  );
}
