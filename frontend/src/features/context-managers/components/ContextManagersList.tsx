import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useContextManagers, useDeleteContextManager } from '../hooks/useContextManagers';
import { usersService } from '../../../api/services/users.service';
import DataTable, { type Column } from '../../../components/common/DataTable';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useState, useMemo } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ContextManager } from '../../../types/context-manager.types';

interface ContextManagersListProps {
  contextId: number | null;
}

export default function ContextManagersList({ contextId }: ContextManagersListProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [managerToDelete, setManagerToDelete] = useState<{ contextId: number; id: number } | null>(null);

  const { data, isLoading, error } = useContextManagers(contextId, { page, pageSize });
  const deleteMutation = useDeleteContextManager();

  // Buscar todos os usuários para mapear nomes (limite máximo de 100)
  const { data: usersData } = useQuery({
    queryKey: ['users', { pageSize: 100 }],
    queryFn: () => usersService.findAll({ pageSize: 100 }),
  });

  // Criar mapa de userId -> User para busca rápida
  const usersMap = useMemo(() => {
    if (!usersData?.data) return new Map();
    const map = new Map();
    usersData.data.forEach((user) => {
      map.set(user.id, user);
    });
    return map;
  }, [usersData]);

  const handleDelete = (manager: ContextManager) => {
    if (contextId) {
      setManagerToDelete({ contextId, id: manager.id });
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (managerToDelete) {
      deleteMutation.mutate(managerToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setManagerToDelete(null);
        },
      });
    }
  };

  const columns: Column<ContextManager>[] = [
    { id: 'id', label: 'ID', minWidth: 70, mobileLabel: 'ID' },
    {
      id: 'userId',
      label: t('contextManagers.user'),
      minWidth: 200,
      mobileLabel: t('contextManagers.user'),
      render: (row) => {
        const user = usersMap.get(row.userId);
        if (user) {
          return (
            <Box>
              <Typography variant="body2">{user.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          );
        }
        return `#${row.userId}`;
      },
    },
    {
      id: 'active',
      label: t('contextManagers.status'),
      minWidth: 100,
      mobileLabel: t('contextManagers.status'),
      render: (row) => (
        <Chip
          label={row.active ? t('contextManagers.active') : t('contextManagers.inactive')}
          color={row.active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: t('contextManagers.actions'),
      minWidth: 150,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/contexts/${contextId}/managers/${row.id}`)}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/contexts/${contextId}/managers/${row.id}/edit`)}
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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={t('contextManagers.errorLoading')} />;
  }

  return (
    <Box>
      {data?.data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          {t('contextManagers.noManagers')}
        </Typography>
      ) : (
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
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('contextManagers.deleteConfirm')}
        message={t('contextManagers.deleteMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setManagerToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

