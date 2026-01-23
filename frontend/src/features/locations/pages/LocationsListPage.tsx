import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Map as MapIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLocations, useDeleteLocation } from '../hooks/useLocations';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectLocation from '../../../components/common/SelectLocation';
import LocationMapViewer from '../../../components/common/LocationMapViewer';
import type { Location } from '../../../types/location.types';

export default function LocationsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [parentIdFilter, setParentIdFilter] = useState<number | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [locationToView, setLocationToView] = useState<Location | null>(null);

  const { data, isLoading, error } = useLocations({
    page,
    pageSize,
    active: activeFilter,
    parentId: parentIdFilter,
  });

  const deleteMutation = useDeleteLocation();

  const handleDelete = (location: Location) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (locationToDelete) {
      deleteMutation.mutate(locationToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setLocationToDelete(null);
        },
      });
    }
  };

  const columns: Column<Location>[] = [
    {
      id: 'id',
      label: 'ID',
      minWidth: 70,
      mobileLabel: 'ID',
    },
    {
      id: 'name',
      label: t('locations.name'),
      minWidth: 150,
      mobileLabel: t('locations.name'),
    },
    {
      id: 'parentId',
      label: t('locations.parent'),
      minWidth: 150,
      mobileLabel: t('locations.parent'),
      render: (row) => {
        if (row.parent) {
          return row.parent.name;
        }
        return row.parentId ? `#${row.parentId}` : '-';
      },
    },
    {
      id: 'coordinates',
      label: t('locations.coordinates'),
      minWidth: 150,
      mobileLabel: t('locations.coordinates'),
      render: (row) => {
        if (row.latitude !== null && row.longitude !== null) {
          return `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`;
        }
        return '-';
      },
    },
    {
      id: 'active',
      label: t('locations.status'),
      minWidth: 100,
      mobileLabel: t('locations.status'),
      render: (row) => (
        <Chip
          label={row.active ? t('locations.active') : t('locations.inactive')}
          color={row.active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: t('locations.actions'),
      minWidth: 120,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/locations/${row.id}`)}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setLocationToView(row);
              setMapDialogOpen(true);
            }}
            title={t('locations.viewOnMap')}
            disabled={row.latitude === null && row.longitude === null && row.polygons === null}
          >
            <MapIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/locations/${row.id}/edit`)}
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
            label: t('locations.status'),
            value: activeFilter ? t('locations.active') : t('locations.inactive'),
            onDelete: () => setActiveFilter(undefined),
          },
        ]
      : []),
    ...(parentIdFilter !== undefined
      ? [
          {
            label: t('locations.parent'),
            value: `#${parentIdFilter}`,
            onDelete: () => setParentIdFilter(undefined),
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={t('locations.errorLoading')} />;
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
        <Typography variant="h4">{t('locations.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/locations/new')}
        >
          {t('locations.newLocation')}
        </Button>
      </Box>

      <Stack spacing={2} sx={{ width: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Box sx={{ minWidth: 200, flexGrow: 1 }}>
            <SelectLocation
              value={parentIdFilter || null}
              onChange={(id) => setParentIdFilter(id || undefined)}
              label={t('locations.filterByParent')}
              activeOnly={false}
            />
          </Box>
          <Button
            variant={activeFilter === true ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === true ? undefined : true)}
          >
            {t('locations.active')}
          </Button>
          <Button
            variant={activeFilter === false ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === false ? undefined : false)}
          >
            {t('locations.inactive')}
          </Button>
        </Box>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setParentIdFilter(undefined);
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
        title={t('locations.deleteConfirm')}
        message={t('locations.deleteMessage', { name: locationToDelete?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setLocationToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />

      <Dialog
        open={mapDialogOpen}
        onClose={() => {
          setMapDialogOpen(false);
          setLocationToView(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{t('locations.mapView')}</Typography>
            <IconButton
              size="small"
              onClick={() => {
                setMapDialogOpen(false);
                setLocationToView(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {locationToView && <LocationMapViewer location={locationToView} height={500} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

