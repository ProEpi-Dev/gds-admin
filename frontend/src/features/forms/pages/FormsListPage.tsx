import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useForms, useDeleteForm } from '../hooks/useForms';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import type { Form } from '../../../types/form.types';

export default function FormsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);

  const { data, isLoading, error } = useForms({
    page,
    pageSize,
    active: activeFilter,
    type: typeFilter as 'signal' | 'quiz' | undefined,
  });

  const deleteMutation = useDeleteForm();

  const handleDelete = (form: Form) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (formToDelete) {
      deleteMutation.mutate(formToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setFormToDelete(null);
        },
      });
    }
  };

  const columns: Column<Form>[] = [
    { id: 'id', label: t('forms.id'), minWidth: 70, mobileLabel: t('forms.id') },
    { id: 'title', label: t('forms.titleField'), minWidth: 150, mobileLabel: t('forms.titleField') },
    {
      id: 'type',
      label: t('forms.type'),
      minWidth: 100,
      mobileLabel: t('forms.type'),
      render: (row) => (
        <Chip label={row.type === 'signal' ? t('forms.signal') : t('forms.quiz')} size="small" />
      ),
    },
    {
      id: 'contextId',
      label: t('forms.context'),
      minWidth: 100,
      mobileLabel: t('forms.context'),
      render: (row) => (row.context?.name || (row.contextId ? `#${row.contextId}` : '-')),
    },
    {
      id: 'active',
      label: t('forms.status'),
      minWidth: 100,
      mobileLabel: t('forms.status'),
      render: (row) => (
        <Chip
          label={row.active ? t('forms.active') : t('forms.inactive')}
          color={row.active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: t('forms.actions'),
      minWidth: 120,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/forms/${row.id}`)}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/forms/${row.id}/edit`)}
            title={t('common.edit')}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(row)}
            color="error"
            title={t('common.delete')}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const filters = [
    ...(activeFilter !== undefined
      ? [
          {
            label: t('forms.status'),
            value: activeFilter ? t('forms.active') : t('forms.inactive'),
            onDelete: () => setActiveFilter(undefined),
          },
        ]
      : []),
    ...(typeFilter
      ? [
          {
            label: t('forms.type'),
            value: typeFilter === 'signal' ? t('forms.signal') : t('forms.quiz'),
            onDelete: () => setTypeFilter(undefined),
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={t('forms.errorLoading')} />;
  }

  return (
    <>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          gap: 2,
        }}
      >
        <Typography variant="h4">
          {t('forms.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/forms/new')}
        >
          {t('forms.newForm')}
        </Button>
      </Box>

      <Stack spacing={2} sx={{ width: '100%' }}>
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1, 
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant={activeFilter === true ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === true ? undefined : true)}
          >
            {t('forms.active')}
          </Button>
          <Button
            variant={activeFilter === false ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === false ? undefined : false)}
          >
            {t('forms.inactive')}
          </Button>
          <Button
            variant={typeFilter === 'signal' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setTypeFilter(typeFilter === 'signal' ? undefined : 'signal')}
          >
            {t('forms.signal')}
          </Button>
          <Button
            variant={typeFilter === 'quiz' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setTypeFilter(typeFilter === 'quiz' ? undefined : 'quiz')}
          >
            {t('forms.quiz')}
          </Button>
        </Box>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setTypeFilter(undefined);
          }}
        />

        <DataTable
            columns={columns}
            data={data?.data || []}
            page={page}
            pageSize={pageSize}
            totalItems={data?.meta.totalItems || 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            loading={isLoading}
          />
      </Stack>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('forms.deleteConfirm')}
        message={t('forms.deleteMessage', { title: formToDelete?.title })}
        confirmText={t('forms.deleteButton')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setFormToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

