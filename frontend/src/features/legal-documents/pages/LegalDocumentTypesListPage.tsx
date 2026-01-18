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
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useTranslation } from "react-i18next";
import { LegalDocumentsAdminService } from "../../../api/services/legal-documents-admin.service";
import type { LegalDocumentType } from "../../../types/legal-document.types";

export default function LegalDocumentTypesListPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<LegalDocumentType | null>(null);

  // Buscar todos os tipos
  const { data: types, isLoading } = useQuery({
    queryKey: ["legal-document-types-admin-all"],
    queryFn: () => LegalDocumentsAdminService.findAllTypes(),
  });

  // Mutação para deletar
  const deleteMutation = useMutation({
    mutationFn: (id: number) => LegalDocumentsAdminService.deleteType(id),
    onSuccess: () => {
      snackbar.showSuccess(t("legalDocuments.types.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["legal-document-types-admin-all"] });
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        t("legalDocuments.types.deleteError");
      snackbar.showError(message);
    },
  });

  const handleDelete = () => {
    if (typeToDelete) {
      deleteMutation.mutate(typeToDelete.id);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "code",
      headerName: t("legalDocuments.types.code"),
      width: 200,
    },
    {
      field: "name",
      headerName: t("legalDocuments.types.name"),
      flex: 1,
      minWidth: 250,
    },
    {
      field: "description",
      headerName: t("legalDocuments.types.description"),
      flex: 2,
      minWidth: 300,
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
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/legal-documents/types/${params.row.id}/edit`)}
            title="Editar"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setTypeToDelete(params.row);
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
          {t("legalDocuments.types.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/legal-documents/types/new")}
        >
          {t("legalDocuments.types.newType")}
        </Button>
      </Box>

      <DataGrid
        rows={types || []}
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
        <DialogTitle>{t("legalDocuments.types.deleteConfirm")}</DialogTitle>
        <DialogContent>
          {t("legalDocuments.types.deleteMessage", {
            name: typeToDelete?.name || "",
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
    </Box>
  );
}
