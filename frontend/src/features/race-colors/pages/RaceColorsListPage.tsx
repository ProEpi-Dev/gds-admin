import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useTranslation } from "../../../hooks/useTranslation";
import { useDeleteRaceColor, useRaceColors } from "../hooks/useRaceColors";
import type { RaceColor } from "../../../types/race-color.types";

export default function RaceColorsListPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RaceColor | null>(null);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(
    undefined,
  );

  const { data: raceColors, isLoading } = useRaceColors({
    activeOnly: activeFilter,
  });
  const deleteMutation = useDeleteRaceColor();

  const handleDelete = (item: RaceColor) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    deleteMutation.mutate(itemToDelete.id, {
      onSuccess: () => {
        snackbar.showSuccess(t("raceColors.deleteSuccess"));
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      },
      onError: (error: any) => {
        const message =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          t("raceColors.deleteError");
        snackbar.showError(message);
      },
    });
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 80 },
    {
      field: "name",
      headerName: t("raceColors.name"),
      flex: 1,
      minWidth: 220,
    },
    {
      field: "active",
      headerName: t("raceColors.status"),
      width: 140,
      renderCell: (params) =>
        params.value ? (
          <Chip label={t("raceColors.active")} size="small" color="success" />
        ) : (
          <Chip label={t("raceColors.inactive")} size="small" color="default" />
        ),
    },
    {
      field: "actions",
      headerName: t("common.actions"),
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/race-colors/${params.row.id}`)}
            title={t("common.view")}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/race-colors/${params.row.id}/edit`)}
            title={t("common.edit")}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row)}
            title={t("common.delete")}
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
        <Typography variant="h4">{t("raceColors.title")}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/race-colors/new")}
        >
          {t("raceColors.newRaceColor")}
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
        <Button
          variant={activeFilter === true ? "contained" : "outlined"}
          size="small"
          onClick={() =>
            setActiveFilter(activeFilter === true ? undefined : true)
          }
        >
          {t("raceColors.active")}
        </Button>
        <Button
          variant={activeFilter === false ? "contained" : "outlined"}
          size="small"
          onClick={() =>
            setActiveFilter(activeFilter === false ? undefined : false)
          }
        >
          {t("raceColors.inactive")}
        </Button>
        {activeFilter !== undefined && (
          <Button
            variant="text"
            size="small"
            onClick={() => setActiveFilter(undefined)}
          >
            {t("common.clearFilters")}
          </Button>
        )}
      </Box>

      <DataGrid
        rows={raceColors || []}
        columns={columns}
        loading={isLoading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        disableRowSelectionOnClick
        getRowId={(row) => row.id}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t("raceColors.deleteConfirm")}</DialogTitle>
        <DialogContent>
          {t("raceColors.deleteMessage", { name: itemToDelete?.name || "" })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
