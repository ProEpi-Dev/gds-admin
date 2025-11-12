import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import SelectLocation from '../../../components/common/SelectLocation';
import { useContexts, useDeleteContext } from '../hooks/useContexts';
import { useTranslation } from '../../../hooks/useTranslation';
import type { Context, ContextAccessType } from '../../../types/context.types';

export default function ContextsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<number | undefined>(undefined);
  const [accessTypeFilter, setAccessTypeFilter] = useState<ContextAccessType | undefined>(
    undefined,
  );
  const [contextToDelete, setContextToDelete] = useState<Context | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data, isLoading, error } = useContexts({
    page,
    pageSize,
    active: activeFilter,
    locationId: locationFilter,
    accessType: accessTypeFilter,
  });

  const deleteMutation = useDeleteContext();

  const handleDelete = (context: Context) => {
    setContextToDelete(context);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (contextToDelete) {
      deleteMutation.mutate(contextToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setContextToDelete(null);
        },
      });
    }
  };

  const columns: Column<Context>[] = [
    {
      id: 'id',
      label: 'ID',
      minWidth: 70,
      mobileLabel: 'ID',
    },
    {
      id: 'name',
      label: t('contexts.name'),
      minWidth: 160,
      mobileLabel: t('contexts.name'),
    },
    {
      id: 'locationId',
      label: t('contexts.location'),
      minWidth: 140,
      mobileLabel: t('contexts.location'),
      render: (row) =>
        row.locationId ? (
          <Button
            variant="text"
            size="small"
            onClick={() => navigate(`/locations/${row.locationId}`)}
            sx={{ textTransform: 'none', p: 0 }}
          >
            #{row.locationId}
          </Button>
        ) : (
          '-'
        ),
    },
    {
      id: 'accessType',
      label: t('contexts.accessType'),
      minWidth: 140,
      mobileLabel: t('contexts.accessType'),
      render: (row) => (
        <Chip
          label={
            row.accessType === 'PUBLIC'
              ? t('contexts.accessTypePublic')
              : t('contexts.accessTypePrivate')
          }
          size="small"
          color={row.accessType === 'PUBLIC' ? 'primary' : 'default'}
        />
      ),
    },
    {
      id: 'active',
      label: t('contexts.status'),
      minWidth: 120,
      mobileLabel: t('contexts.status'),
      render: (row) => (
        <Chip
          label={row.active ? t('contexts.active') : t('contexts.inactive')}
          color={row.active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: t('contexts.actions'),
      minWidth: 140,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/contexts/${row.id}`)}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/contexts/${row.id}/edit`)}
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
            label: t('contexts.status'),
            value: activeFilter ? t('contexts.active') : t('contexts.inactive'),
            onDelete: () => setActiveFilter(undefined),
          },
        ]
      : []),
    ...(locationFilter !== undefined
      ? [
          {
            label: t('contexts.location'),
            value: `#${locationFilter}`,
            onDelete: () => setLocationFilter(undefined),
          },
        ]
      : []),
    ...(accessTypeFilter !== undefined
      ? [
          {
            label: t('contexts.accessType'),
            value:
              accessTypeFilter === 'PUBLIC'
                ? t('contexts.accessTypePublic')
                : t('contexts.accessTypePrivate'),
            onDelete: () => setAccessTypeFilter(undefined),
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={t('contexts.errorLoading')} />;
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
        <Typography variant="h4">{t('contexts.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/contexts/new')}
        >
          {t('contexts.newContext')}
        </Button>
      </Box>

      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Box sx={{ minWidth: 220, flexGrow: 1 }}>
            <SelectLocation
              value={locationFilter || null}
              onChange={(id) => setLocationFilter(id || undefined)}
              label={t('contexts.filterByLocation')}
              activeOnly={false}
            />
          </Box>

          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>{t('contexts.filterByAccessType')}</InputLabel>
            <Select
              value={accessTypeFilter ?? ''}
              label={t('contexts.filterByAccessType')}
              onChange={(event) => {
                const value = event.target.value as string;
                setAccessTypeFilter(
                  value === '' || value === undefined ? undefined : (value as ContextAccessType),
                );
              }}
            >
              <MenuItem value="">
                <em>{t('common.clear')}</em>
              </MenuItem>
              <MenuItem value="PUBLIC">{t('contexts.accessTypePublic')}</MenuItem>
              <MenuItem value="PRIVATE">{t('contexts.accessTypePrivate')}</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant={activeFilter === true ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === true ? undefined : true)}
          >
            {t('contexts.active')}
          </Button>
          <Button
            variant={activeFilter === false ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === false ? undefined : false)}
          >
            {t('contexts.inactive')}
          </Button>
        </Box>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setLocationFilter(undefined);
            setAccessTypeFilter(undefined);
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
        />
      </Stack>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('contexts.deleteConfirm')}
        message={t('contexts.deleteMessage', { name: contextToDelete?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setContextToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}


