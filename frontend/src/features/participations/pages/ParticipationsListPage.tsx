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
import { useParticipations, useDeleteParticipation } from '../hooks/useParticipations';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Participation } from '../../../types/participation.types';

export default function ParticipationsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [participationToDelete, setParticipationToDelete] = useState<Participation | null>(null);

  const { data, isLoading, error } = useParticipations({
    page,
    pageSize,
    active: activeFilter,
  });

  const deleteMutation = useDeleteParticipation();

  const handleDelete = (participation: Participation) => {
    setParticipationToDelete(participation);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (participationToDelete) {
      deleteMutation.mutate(participationToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setParticipationToDelete(null);
        },
      });
    }
  };

  const columns: Column<Participation>[] = [
    {
      id: 'userId',
      label: t('participations.user'),
      minWidth: 100,
      mobileLabel: t('participations.user'),
      render: (row) => `#${row.userId}`,
    },
    {
      id: 'contextId',
      label: t('participations.context'),
      minWidth: 100,
      mobileLabel: t('participations.context'),
      render: (row) => `#${row.contextId}`,
    },
    {
      id: 'startDate',
      label: t('participations.startDate'),
      minWidth: 120,
      mobileLabel: t('participations.startDate'),
      render: (row) => format(new Date(row.startDate), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      id: 'endDate',
      label: t('participations.endDate'),
      minWidth: 120,
      mobileLabel: t('participations.endDate'),
      render: (row) => row.endDate ? format(new Date(row.endDate), 'dd/MM/yyyy', { locale: ptBR }) : '-',
    },
    {
      id: 'active',
      label: t('participations.status'),
      minWidth: 100,
      mobileLabel: t('participations.status'),
      render: (row) => (
        <Chip
          label={row.active ? t('participations.active') : t('participations.inactive')}
          color={row.active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: t('participations.actions'),
      minWidth: 120,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/participations/${row.id}`)}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/participations/${row.id}/edit`)}
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
            label: t('participations.status'),
            value: activeFilter ? t('participations.active') : t('participations.inactive'),
            onDelete: () => setActiveFilter(undefined),
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={t('participations.errorLoading')} />;
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
        <Typography variant="h4">{t('participations.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/participations/new')}
        >
          {t('participations.newParticipation')}
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
            {t('participations.active')}
          </Button>
          <Button
            variant={activeFilter === false ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === false ? undefined : false)}
          >
            {t('participations.inactive')}
          </Button>
        </Box>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
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
        title={t('participations.deleteConfirm')}
        message={t('participations.deleteMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setParticipationToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

