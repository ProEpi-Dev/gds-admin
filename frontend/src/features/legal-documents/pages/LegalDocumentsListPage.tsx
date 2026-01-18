import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useTranslation } from "react-i18next";
import { LegalDocumentsAdminService } from "../../../api/services/legal-documents-admin.service";
import type { LegalDocument } from "../../../types/legal-document.types";
import LegalDocumentViewer from "../../../components/common/LegalDocumentViewer";

export default function LegalDocumentsListPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<LegalDocument | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [documentToView, setDocumentToView] = useState<LegalDocument | null>(null);

  // Buscar todos os documentos
  const { data: documents, isLoading } = useQuery({
    queryKey: ["legal-documents-admin"],
    queryFn: () => LegalDocumentsAdminService.findAllDocuments(),
  });

  // Mutação para deletar
  const deleteMutation = useMutation({
    mutationFn: (id: number) => LegalDocumentsAdminService.deleteDocument(id),
    onSuccess: () => {
      snackbar.showSuccess(t("legalDocuments.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["legal-documents-admin"] });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        t("legalDocuments.deleteError");
      snackbar.showError(message);
    },
  });

  const handleDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete.id);
    }
  };

  const handleView = (document: LegalDocument) => {
    setDocumentToView(document);
    setViewDialogOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: "typeName",
      headerName: t("legalDocuments.type"),
      flex: 1,
      minWidth: 180,
    },
    {
      field: "title",
      headerName: t("legalDocuments.title"),
      flex: 2,
      minWidth: 250,
    },
    {
      field: "version",
      headerName: t("legalDocuments.version"),
      width: 100,
    },
    {
      field: "isRequired",
      headerName: t("legalDocuments.required"),
      width: 130,
      renderCell: (params) =>
        params.value ? (
          <Chip label="Obrigatório" size="small" color="error" />
        ) : (
          <Chip label="Opcional" size="small" color="default" />
        ),
    },
    {
      field: "active",
      headerName: t("legalDocuments.status"),
      width: 100,
      renderCell: (params) =>
        params.value ? (
          <Chip label="Ativo" size="small" color="success" />
        ) : (
          <Chip label="Inativo" size="small" color="default" />
        ),
    },
    {
      field: "actions",
      headerName: t("common.actions"),
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => handleView(params.row)}
            title="Visualizar"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/legal-documents/${params.row.id}/edit`)}
            title="Editar"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setDocumentToDelete(params.row);
              setDeleteDialogOpen(true);
            }}
            color="error"
            title="Deletar"
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
        <Typography variant="h4" component="h1">
          {t("legalDocuments.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/legal-documents/new")}
        >
          {t("legalDocuments.newDocument")}
        </Button>
      </Box>

      <DataGrid
        rows={documents || []}
        columns={columns}
        loading={isLoading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
        disableRowSelectionOnClick
        sx={{
          "& .MuiDataGrid-row:hover": {
            cursor: "pointer",
          },
        }}
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t("legalDocuments.deleteConfirm")}</DialogTitle>
        <DialogContent>
          {t("legalDocuments.deleteMessage", {
            title: documentToDelete?.title || "",
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de visualização */}
      {documentToView && (
        <LegalDocumentViewer
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setDocumentToView(null);
          }}
          title={documentToView.title}
          content={documentToView.content}
          version={documentToView.version}
        />
      )}
    </Box>
  );
}
