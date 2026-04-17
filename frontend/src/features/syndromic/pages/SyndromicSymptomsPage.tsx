import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  useCreateSyndromicSymptom,
  useDeleteSyndromicSymptom,
  useSyndromicSymptoms,
  useUpdateSyndromicSymptom,
} from "../hooks/useSyndromicClassification";
import { useSnackbar } from "../../../hooks/useSnackbar";
import type { Symptom } from "../../../types/syndromic.types";

type FormState = {
  code: string;
  name: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  description: "",
};

export default function SyndromicSymptomsPage() {
  const snackbar = useSnackbar();
  const { data: symptoms, isLoading } = useSyndromicSymptoms();
  const createMutation = useCreateSyndromicSymptom();
  const updateMutation = useUpdateSyndromicSymptom();
  const deleteMutation = useDeleteSyndromicSymptom();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Symptom | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Symptom | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: Symptom) => {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) {
      snackbar.showError("Informe código e nome");
      return;
    }

    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          data: {
            code: form.code.trim(),
            name: form.name.trim(),
            description: form.description.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            snackbar.showSuccess("Sintoma atualizado");
            setDialogOpen(false);
          },
          onError: (error: any) =>
            snackbar.showError(
              error?.response?.data?.message ?? "Erro ao atualizar sintoma",
            ),
        },
      );
      return;
    }

    createMutation.mutate(
      {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          snackbar.showSuccess("Sintoma criado");
          setDialogOpen(false);
        },
        onError: (error: any) =>
          snackbar.showError(
            error?.response?.data?.message ?? "Erro ao criar sintoma",
          ),
      },
    );
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMutation.mutate(toDelete.id, {
      onSuccess: () => {
        snackbar.showSuccess("Sintoma desativado");
        setDeleteDialogOpen(false);
        setToDelete(null);
      },
      onError: (error: any) =>
        snackbar.showError(
          error?.response?.data?.message ?? "Erro ao desativar sintoma",
        ),
    });
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "code", headerName: "Código", width: 180 },
    { field: "name", headerName: "Nome", flex: 1, minWidth: 220 },
    {
      field: "active",
      headerName: "Status",
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <Chip size="small" color="success" label="Ativo" />
        ) : (
          <Chip size="small" label="Inativo" />
        ),
    },
    {
      field: "actions",
      headerName: "Ações",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={() => openEdit(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setToDelete(params.row);
              setDeleteDialogOpen(true);
            }}
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
          mb: 2,
        }}
      >
        <Typography variant="h4">Classificação Sindrômica - Sintomas</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Novo sintoma
        </Button>
      </Box>

      <DataGrid
        rows={symptoms ?? []}
        columns={columns}
        loading={isLoading}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Editar sintoma" : "Novo sintoma"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, mt: 1 }}>
          <TextField
            label="Código"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Descrição"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Desativar sintoma</DialogTitle>
        <DialogContent>
          Tem certeza que deseja desativar o sintoma "{toDelete?.name}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            Desativar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
