import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
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
  Search as SearchIcon,
} from '@mui/icons-material';
import { useParticipations, useDeleteParticipation } from '../hooks/useParticipations';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import { useCurrentContext } from '../../../contexts/CurrentContextContext';
import {
  formatDateOnlyFromApi,
  formatDateTimeFromApi,
} from '../../../utils/formatDateOnlyFromApi';
import {
  DEFAULT_PARTICIPATION_LIST_SORT,
  type Participation,
  type ParticipationListSort,
} from '../../../types/participation.types';

const PARTICIPATION_SORT_OPTIONS: ParticipationListSort[] = [
  'name_asc',
  'name_desc',
  'startDate_asc',
  'startDate_desc',
];

const PARTICIPATION_SORT_LABEL_KEY: Record<ParticipationListSort, string> = {
  name_asc: 'participations.sortNameAsc',
  name_desc: 'participations.sortNameDesc',
  startDate_asc: 'participations.sortStartDateAsc',
  startDate_desc: 'participations.sortStartDateDesc',
};

export default function ParticipationsListPage() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();
  const { currentContext } = useCurrentContext();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [participationToDelete, setParticipationToDelete] = useState<Participation | null>(null);
  const [listSort, setListSort] = useState<ParticipationListSort>(DEFAULT_PARTICIPATION_LIST_SORT);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [listSort]);

  const { data, isFetching, error } = useParticipations({
    page,
    pageSize,
    active: activeFilter,
    contextId: currentContext?.id,
    includeUser: true,
    search: debouncedSearch || undefined,
    sort: listSort,
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
      id: 'userName',
      label: t('participations.user'),
      minWidth: 160,
      mobileLabel: t('participations.user'),
      render: (row) => (
        <Box>
          <Typography variant="body2">{row.userName ?? `#${row.userId}`}</Typography>
          {row.userEmail && (
            <Typography variant="caption" color="text.secondary">
              {row.userEmail}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'startDate',
      label: t('participations.startDate'),
      minWidth: 120,
      mobileLabel: t('participations.startDate'),
      render: (row) => formatDateOnlyFromApi(row.startDate),
    },
    {
      id: 'createdAt',
      label: t('participations.createdAt'),
      minWidth: 150,
      mobileLabel: t('participations.createdAt'),
      render: (row) => formatDateTimeFromApi(row.createdAt, currentLanguage),
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
      id: 'integrationTrainingMode',
      label: t('participations.integrationTraining'),
      minWidth: 130,
      mobileLabel: t('participations.integrationTraining'),
      render: (row) => {
        const training = row.integrationTrainingMode ?? false;
        return (
          <Chip
            label={training ? t('participations.integrationTrainingOn') : t('participations.integrationTrainingOff')}
            color={training ? 'warning' : 'default'}
            size="small"
            variant={training ? 'filled' : 'outlined'}
          />
        );
      },
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
    ...(debouncedSearch
      ? [
          {
            label: t('participations.searchFilter'),
            value: debouncedSearch,
            onDelete: () => {
              setSearchInput('');
              setDebouncedSearch('');
            },
          },
        ]
      : []),
  ];

  return (
    <>
      {error && <ErrorAlert message={t('participations.errorLoading')} />}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4">{t('participations.title')}</Typography>
          {currentContext && (
            <Typography variant="body2" color="text.secondary">
              {currentContext.name}
            </Typography>
          )}
        </Box>
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
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            label={t('participations.searchLabel')}
            placeholder={t('participations.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ minWidth: 260, flex: { sm: '1 1 280px' }, maxWidth: { sm: 440 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 280 } }}>
            <InputLabel id="participations-sort-label">{t('participations.sortBy')}</InputLabel>
            <Select
              labelId="participations-sort-label"
              label={t('participations.sortBy')}
              value={listSort}
              onChange={(e) => setListSort(e.target.value as ParticipationListSort)}
            >
              {PARTICIPATION_SORT_OPTIONS.map((value) => (
                <MenuItem key={value} value={value}>
                  {t(PARTICIPATION_SORT_LABEL_KEY[value])}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setSearchInput('');
            setDebouncedSearch('');
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
          loading={isFetching}
          cardGridTemplateColumns={{
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))',
          }}
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
