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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useLocation, useDeleteLocation } from '../hooks/useLocations';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTranslation } from '../../../hooks/useTranslation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LocationViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const locationId = id ? parseInt(id, 10) : null;
  const { data: location, isLoading, error } = useLocation(locationId);

  const deleteMutation = useDeleteLocation();

  const handleDelete = () => {
    if (locationId) {
      deleteMutation.mutate(locationId, {
        onSuccess: () => {
          navigate('/locations');
        },
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !location) {
    return <ErrorAlert message={t('locations.errorLoadingLocation')} />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/locations')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('locations.title')} #{location.id}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/locations/${locationId}/edit`)}
        >
          {t('common.edit')}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          {t('common.delete')}
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('locations.name')}
            </Typography>
            <Typography variant="body1">{location.name}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('locations.parent')}
            </Typography>
            <Typography variant="body1">
              {location.parentId ? (
                <Button
                  variant="text"
                  onClick={() => navigate(`/locations/${location.parentId}`)}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  #{location.parentId}
                </Button>
              ) : (
                '-'
              )}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('locations.coordinates')}
            </Typography>
            <Typography variant="body1">
              {location.latitude !== null && location.longitude !== null
                ? `${location.latitude}, ${location.longitude}`
                : '-'}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('locations.status')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={location.active ? t('locations.active') : t('locations.inactive')}
                color={location.active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          {location.polygons && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('locations.polygons')}
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    mt: 1,
                    bgcolor: 'grey.50',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                  }}
                >
                  <pre>{JSON.stringify(location.polygons, null, 2)}</pre>
                </Paper>
              </Box>
            </>
          )}

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('locations.createdAt')}
            </Typography>
            <Typography variant="body1">
              {format(new Date(location.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('locations.updatedAt')}
            </Typography>
            <Typography variant="body1">
              {format(new Date(location.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('locations.deleteConfirm')}
        message={t('locations.deleteMessage', { name: location.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}



