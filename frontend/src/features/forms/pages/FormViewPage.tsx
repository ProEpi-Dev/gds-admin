import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useForm as useFormQuery, useDeleteForm } from '../hooks/useForms';
import { useFormVersions } from '../hooks/useFormVersions';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import FormVersionsList from '../components/FormVersionsList';
import FormVersionCreate from '../components/FormVersionCreate';

export default function FormViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const formId = id ? parseInt(id, 10) : null;
  const { data: form, isLoading, error } = useFormQuery(formId);
  // Verificar se há versões do formulário
  const { data: versionsData, isLoading: isLoadingVersions } = useFormVersions(formId, { page: 1, pageSize: 1 });

  const deleteMutation = useDeleteForm();

  const handleDelete = () => {
    if (formId) {
      deleteMutation.mutate(formId, {
        onSuccess: () => {
          navigate('/forms');
        },
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !form) {
    return <ErrorAlert message="Erro ao carregar formulário" />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/forms')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {form.title}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/forms/${formId}/edit`)}
        >
          Editar
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          Deletar
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              ID
            </Typography>
            <Typography variant="body1">{form.id}</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              Tipo
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip label={form.type === 'signal' ? 'Sinal' : 'Quiz'} size="small" />
            </Box>
          </Box>

          {form.context && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" color="text.secondary">
                Contexto
              </Typography>
              <Typography variant="body1">{form.context.name}</Typography>
              {form.context.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {form.context.description}
                </Typography>
              )}
            </Box>
          )}

          {form.reference && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" color="text.secondary">
                Referência
              </Typography>
              <Typography variant="body1">{form.reference}</Typography>
            </Box>
          )}

          {form.description && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" color="text.secondary">
                Descrição
              </Typography>
              <Typography variant="body1">{form.description}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={form.active ? 'Ativo' : 'Inativo'}
                color={form.active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        {isLoadingVersions ? (
          <LoadingSpinner />
        ) : versionsData?.data && versionsData.data.length > 0 ? (
          <FormVersionsList formId={formId} />
        ) : (
          <FormVersionCreate formId={formId} />
        )}
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja deletar o formulário "${form.title}"?`}
        confirmText="Deletar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

