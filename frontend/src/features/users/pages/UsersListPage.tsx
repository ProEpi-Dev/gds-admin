import { useState } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useUsers, useDeleteUser } from '../hooks/useUsers';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';
import { useDebounce } from '../../../hooks/useDebounce';
import type { User } from '../../../types/user.types';

export default function UsersListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data, isLoading, error } = useUsers({
    page,
    pageSize,
    active: activeFilter,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteUser();

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        },
      });
    }
  };

  const columns: Column<User>[] = [
    {
      id: 'id',
      label: 'ID',
      minWidth: 70,
      mobileLabel: 'ID',
    },
    {
      id: 'name',
      label: t('users.name'),
      minWidth: 150,
      mobileLabel: t('users.name'),
    },
    {
      id: 'email',
      label: t('users.email'),
      minWidth: 200,
      mobileLabel: t('users.email'),
    },
    {
      id: 'active',
      label: t('users.status'),
      minWidth: 100,
      mobileLabel: t('users.status'),
      render: (row) => (
        <Chip
          label={row.active ? t('users.active') : t('users.inactive')}
          color={row.active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: t('users.actions'),
      minWidth: 120,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/users/${row.id}`)}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/users/${row.id}/edit`)}
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
            label: t('users.status'),
            value: activeFilter ? t('users.active') : t('users.inactive'),
            onDelete: () => setActiveFilter(undefined),
          },
        ]
      : []),
    ...(debouncedSearch
      ? [
          {
            label: t('common.search'),
            value: debouncedSearch,
            onDelete: () => setSearchTerm(''),
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={t('users.errorLoading')} />;
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
        <Typography variant="h4">{t('users.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/users/new')}
        >
          {t('users.newUser')}
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
            placeholder={t('users.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant={activeFilter === true ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === true ? undefined : true)}
          >
            {t('users.active')}
          </Button>
          <Button
            variant={activeFilter === false ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActiveFilter(activeFilter === false ? undefined : false)}
          >
            {t('users.inactive')}
          </Button>
        </Box>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setActiveFilter(undefined);
            setSearchTerm('');
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
        title={t('users.deleteConfirm')}
        message={t('users.deleteMessage', { name: userToDelete?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

