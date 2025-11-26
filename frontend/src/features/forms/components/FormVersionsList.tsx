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
import { useFormVersions, useDeleteFormVersion } from '../hooks/useFormVersions';
import DataTable, { type Column } from '../../../components/common/DataTable';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useState } from 'react';
import type { FormVersion } from '../../../types/form-version.types';

interface FormVersionsListProps {
  formId: number | null;
}

export default function FormVersionsList({ formId }: FormVersionsListProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<{ formId: number; id: number } | null>(null);

  const { data, isLoading, error } = useFormVersions(formId, { page, pageSize });
  const deleteMutation = useDeleteFormVersion();

  const handleDelete = (version: FormVersion) => {
    if (formId) {
      setVersionToDelete({ formId, id: version.id });
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (versionToDelete) {
      deleteMutation.mutate(versionToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setVersionToDelete(null);
        },
      });
    }
  };

  const columns: Column<FormVersion>[] = [
    { id: 'versionNumber', label: 'Versão', minWidth: 100, mobileLabel: 'Versão' },
    {
      id: 'accessType',
      label: 'Tipo de Acesso',
      minWidth: 150,
      mobileLabel: 'Acesso',
      render: (row) => (
        <Chip
          label={row.accessType === 'PUBLIC' ? 'Público' : 'Privado'}
          size="small"
          color={row.accessType === 'PUBLIC' ? 'success' : 'default'}
        />
      ),
    },
    {
      id: 'active',
      label: 'Status',
      minWidth: 100,
      mobileLabel: 'Status',
      render: (row) => (
        <Chip
          label={row.active ? 'Ativo' : 'Inativo'}
          color={row.active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      minWidth: 150,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/forms/${formId}/versions/${row.id}`)}
            title="Visualizar"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/forms/${formId}/versions/${row.id}/edit`)}
            title="Editar"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(row)}
            color="error"
            title="Deletar"
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
    return <ErrorAlert message="Erro ao carregar versões" />;
  }

  return (
    <Box>
      {data?.data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          Nenhuma versão cadastrada.
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
        title="Confirmar exclusão"
        message="Tem certeza que deseja deletar esta versão?"
        confirmText="Deletar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setVersionToDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

