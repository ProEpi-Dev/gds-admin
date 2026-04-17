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
  useCreateSyndrome,
  useDeleteSyndrome,
  useSyndromicSyndromes,
  useUpdateSyndrome,
} from "../hooks/useSyndromicClassification";
import { useSnackbar } from "../../../hooks/useSnackbar";
import type { Syndrome } from "../../../types/syndromic.types";

type FormState = {
  code: string;
  name: string;
  description: string;
  thresholdScore: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  description: "",
  thresholdScore: "",
};

export default function SyndromicSyndromesPage() {
  const snackbar = useSnackbar();
  const { data: syndromes, isLoading } = useSyndromicSyndromes();
  const createMutation = useCreateSyndrome();
  const updateMutation = useUpdateSyndrome();
  const deleteMutation = useDeleteSyndrome();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Syndrome | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Syndrome | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: Syndrome) => {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      thresholdScore: String(item.threshold_score ?? ""),
    });
    setDialogOpen(true);
  };

  const parseThreshold = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed;
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) {
      snackbar.showError("Informe código e nome");
      return;
    }

    const threshold = parseThreshold(form.thresholdScore);
    if (threshold !== undefined && (threshold < 0 || threshold > 1)) {
      snackbar.showError("O limiar deve estar entre 0 e 1");
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
            thresholdScore: threshold,
          },
        },
        {
          onSuccess: () => {
            snackbar.showSuccess("Síndrome atualizada");
            setDialogOpen(false);
          },
          onError: (error: any) =>
            snackbar.showError(
              error?.response?.data?.message ?? "Erro ao atualizar síndrome",
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
        thresholdScore: threshold,
      },
      {
        onSuccess: () => {
          snackbar.showSuccess("Síndrome criada");
          setDialogOpen(false);
        },
        onError: (error: any) =>
          snackbar.showError(
            error?.response?.data?.message ?? "Erro ao criar síndrome",
          ),
      },
    );
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMutation.mutate(toDelete.id, {
      onSuccess: () => {
        snackbar.showSuccess("Síndrome desativada");
        setDeleteDialogOpen(false);
        setToDelete(null);
      },
      onError: (error: any) =>
        snackbar.showError(
          error?.response?.data?.message ?? "Erro ao desativar síndrome",
        ),
    });
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "code", headerName: "Código", width: 180 },
    { field: "name", headerName: "Nome", flex: 1, minWidth: 220 },
    {
      field: "threshold_score",
      headerName: "Limiar",
      width: 120,
      renderCell: (params) =>
        params.value !== null && params.value !== undefined
          ? Number(params.value).toFixed(2)
          : "-",
    },
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
        <Typography variant="h4">Classificação Sindrômica - Síndromes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nova síndrome
        </Button>
      </Box>

      <DataGrid
        rows={syndromes ?? []}
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
        <DialogTitle>{editing ? "Editar síndrome" : "Nova síndrome"}</DialogTitle>
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
            label="Limiar (0..1)"
            value={form.thresholdScore}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, thresholdScore: e.target.value }))
            }
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
        <DialogTitle>Desativar síndrome</DialogTitle>
        <DialogContent>
          Tem certeza que deseja desativar a síndrome "{toDelete?.name}"?
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
