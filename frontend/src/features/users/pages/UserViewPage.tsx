import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  Divider,
  Stack,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useUser, useDeleteUser } from '../hooks/useUsers';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTranslation } from '../../../hooks/useTranslation';
import { getErrorMessage } from '../../../utils/errorHandler';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function UserViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const userId = id ? parseInt(id, 10) : null;
  const { data: user, isLoading, error } = useUser(userId);

  const deleteMutation = useDeleteUser();

  const handleDelete = () => {
    setDeleteError(null);
    if (userId) {
      deleteMutation.mutate(userId, {
        onSuccess: () => {
          navigate('/users');
        },
        onError: (err: unknown) => {
          setDeleteError(
            getErrorMessage(err, t('users.errorDeletingUserDependencies')),
          );
        },
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !user) {
    return <ErrorAlert message={t('users.errorLoadingUser')} />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/users')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('users.title')} #{user.id}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/users/${userId}/edit`)}
        >
          {t('common.edit')}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => {
            setDeleteError(null);
            setDeleteDialogOpen(true);
          }}
        >
          {t('common.delete')}
        </Button>
      </Box>

      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('users.name')}
            </Typography>
            <Typography variant="body1">{user.name}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('users.email')}
            </Typography>
            <Typography variant="body1">{user.email}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('users.status')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={user.active ? t('users.active') : t('users.inactive')}
                color={user.active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('users.createdAt')}
            </Typography>
            <Typography variant="body1">
              {format(new Date(user.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('users.updatedAt')}
            </Typography>
            <Typography variant="body1">
              {format(new Date(user.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('users.deleteConfirm')}
        message={
          user.active
            ? t('users.deleteMessage', { name: user.name })
            : t('users.deleteMessageInactive', { name: user.name })
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeleteError(null);
        }}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

