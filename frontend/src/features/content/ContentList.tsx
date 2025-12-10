import { useEffect, useState } from "react";
import { ContentService } from "../../api/services/content.service";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import DataTable, { type Column } from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import MobilePreviewDialog from "../../components/common/MobilePreviewDialog";

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
      <MobilePreviewDialog
        open={!!previewContent}
        onClose={() => setPreviewContent(null)}
        title={previewContent?.title || ""}
        htmlContent={previewContent?.content || ""}
      />

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
