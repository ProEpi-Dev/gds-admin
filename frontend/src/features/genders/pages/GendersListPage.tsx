import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useTranslation } from '../../../hooks/useTranslation';
import { useGenders, useDeleteGender } from '../hooks/useGenders';
import type { Gender } from '../../../types/gender.types';

export default function GendersListPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [genderToDelete, setGenderToDelete] = useState<Gender | null>(null);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const { data: genders, isLoading } = useGenders({
    activeOnly: activeFilter,
  });

  const deleteMutation = useDeleteGender();

  const handleDelete = (gender: Gender) => {
    setGenderToDelete(gender);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (genderToDelete) {
      deleteMutation.mutate(genderToDelete.id, {
        onSuccess: () => {
          snackbar.showSuccess(t('genders.deleteSuccess'));
          setDeleteDialogOpen(false);
          setGenderToDelete(null);
        },
        onError: (error: any) => {
          const message =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            t('genders.deleteError');
          snackbar.showError(message);
        },
      });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
    },
    {
      field: 'name',
      headerName: t('genders.name'),
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'active',
      headerName: t('genders.status'),
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <Chip label={t('genders.active')} size="small" color="success" />
        ) : (
          <Chip label={t('genders.inactive')} size="small" color="default" />
        ),
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/genders/${params.row.id}`)}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/genders/${params.row.id}/edit`)}
            title={t('common.edit')}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row)}
            color="error"
            title={t('common.delete')}
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t('genders.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/genders/new')}
        >
          {t('genders.newGender')}
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant={activeFilter === true ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setActiveFilter(activeFilter === true ? undefined : true)}
        >
          {t('genders.active')}
        </Button>
        <Button
          variant={activeFilter === false ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setActiveFilter(activeFilter === false ? undefined : false)}
        >
          {t('genders.inactive')}
        </Button>
        {activeFilter !== undefined && (
          <Button
            variant="text"
            size="small"
            onClick={() => setActiveFilter(undefined)}
          >
            {t('common.clearFilters')}
          </Button>
        )}
      </Box>

      <DataGrid
        rows={genders || []}
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
        getRowId={(row) => row.id}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t('genders.deleteConfirm')}</DialogTitle>
        <DialogContent>
          {t('genders.deleteMessage', {
            name: genderToDelete?.name || '',
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
