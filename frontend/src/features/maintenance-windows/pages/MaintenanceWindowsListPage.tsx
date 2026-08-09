import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DataTable, { type Column } from '../../../components/common/DataTable';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSnackbar } from '../../../hooks/useSnackbar';
import {
  useMaintenanceWindows,
  useDeleteMaintenanceWindow,
} from '../hooks/useMaintenanceWindows';
import { formatDateTimeFromApi } from '../../../utils/formatDateOnlyFromApi';
import type {
  MaintenanceMode,
  MaintenanceWindow,
} from '../../../types/maintenance-window.types';

const MODE_COLOR: Record<MaintenanceMode, 'info' | 'warning' | 'error'> = {
  banner: 'info',
  read_only: 'warning',
  full: 'error',
};

type DisplayStatus = 'inEffect' | 'scheduled' | 'ended' | 'disabled';

function resolveDisplayStatus(window: MaintenanceWindow): DisplayStatus {
  if (!window.active) return 'disabled';
  if (window.inEffect) return 'inEffect';
  if (new Date(window.startsAt).getTime() > Date.now()) return 'scheduled';
  return 'ended';
}

const STATUS_COLOR: Record<
  DisplayStatus,
  'error' | 'info' | 'default' | 'success'
> = {
  inEffect: 'error',
  scheduled: 'info',
  ended: 'default',
  disabled: 'default',
};

export default function MaintenanceWindowsListPage() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();
  const snackbar = useSnackbar();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(
    undefined,
  );
  const [modeFilter, setModeFilter] = useState<MaintenanceMode | ''>('');
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceWindow | null>(
    null,
  );

  const query = useMemo(
    () => ({
      page,
      pageSize,
      active: activeFilter,
      mode: modeFilter || undefined,
    }),
    [page, pageSize, activeFilter, modeFilter],
  );

  const { data, isLoading, error } = useMaintenanceWindows(query);
  const deleteMutation = useDeleteMaintenanceWindow();

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        snackbar.showSuccess(t('maintenanceWindows.deleteSuccess'));
        setDeleteTarget(null);
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message;
        snackbar.showError(message || t('maintenanceWindows.deleteError'));
        setDeleteTarget(null);
      },
    });
  };

  const columns: Column<MaintenanceWindow>[] = [
    {
      id: 'mode',
      label: t('maintenanceWindows.mode'),
      minWidth: 140,
      render: (row) => (
        <Chip
          label={t(`maintenanceWindows.modes.${row.mode}`)}
          size="small"
          color={MODE_COLOR[row.mode]}
        />
      ),
    },
    {
      id: 'titlePt',
      label: t('maintenanceWindows.title'),
      minWidth: 200,
      render: (row) => row.title.pt,
    },
    {
      id: 'period',
      label: t('maintenanceWindows.period'),
      minWidth: 260,
      render: (row) => {
        const start = formatDateTimeFromApi(row.startsAt, currentLanguage);
        const end = row.endsAt
          ? formatDateTimeFromApi(row.endsAt, currentLanguage)
          : t('maintenanceWindows.noEndDateShort');
        return `${start} → ${end}`;
      },
    },
    {
      id: 'status',
      label: t('maintenanceWindows.status'),
      minWidth: 140,
      render: (row) => {
        const status = resolveDisplayStatus(row);
        return (
          <Chip
            label={t(`maintenanceWindows.statuses.${status}`)}
            size="small"
            color={STATUS_COLOR[status]}
          />
        );
      },
    },
    {
      id: 'actions',
      label: t('common.actions'),
      minWidth: 120,
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              onClick={() => navigate(`/maintenance-windows/${row.id}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteTarget(row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
          {t('maintenanceWindows.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/maintenance-windows/new')}
        >
          {t('maintenanceWindows.newWindow')}
        </Button>
      </Box>

      {error && <ErrorAlert message={t('maintenanceWindows.errorLoading')} />}

      <Stack spacing={2}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            select
            size="small"
            label={t('maintenanceWindows.mode')}
            value={modeFilter}
            onChange={(e) => {
              setModeFilter(e.target.value as MaintenanceMode | '');
              setPage(1);
            }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">{t('maintenanceWindows.allModes')}</MenuItem>
            <MenuItem value="banner">{t('maintenanceWindows.modes.banner')}</MenuItem>
            <MenuItem value="read_only">
              {t('maintenanceWindows.modes.read_only')}
            </MenuItem>
            <MenuItem value="full">{t('maintenanceWindows.modes.full')}</MenuItem>
          </TextField>

          <Button
            variant={activeFilter === true ? 'contained' : 'outlined'}
            size="small"
            onClick={() => {
              setActiveFilter(activeFilter === true ? undefined : true);
              setPage(1);
            }}
          >
            {t('genders.active')}
          </Button>
          <Button
            variant={activeFilter === false ? 'contained' : 'outlined'}
            size="small"
            onClick={() => {
              setActiveFilter(activeFilter === false ? undefined : false);
              setPage(1);
            }}
          >
            {t('genders.inactive')}
          </Button>
        </Box>

        <DataTable
          columns={columns}
          data={data?.data || []}
          page={page}
          pageSize={pageSize}
          totalItems={data?.meta.totalItems || 0}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={isLoading}
          emptyMessage={t('maintenanceWindows.empty')}
          variant="table"
        />
      </Stack>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('maintenanceWindows.deleteConfirm')}</DialogTitle>
        <DialogContent>
          {t('maintenanceWindows.deleteMessage', {
            title: deleteTarget?.title.pt || '',
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
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
