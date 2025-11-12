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
import { useParticipation, useDeleteParticipation } from '../hooks/useParticipations';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTranslation } from '../../../hooks/useTranslation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReports } from '../../reports/hooks/useReports';

export default function ParticipationViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const participationId = id ? parseInt(id, 10) : null;
  const { data: participation, isLoading, error } = useParticipation(participationId);

  // Buscar reports associados a esta participação
  const { data: reportsData } = useReports({
    participationId: participationId || undefined,
    pageSize: 100,
  });

  const deleteMutation = useDeleteParticipation();

  const handleDelete = () => {
    if (participationId) {
      deleteMutation.mutate(participationId, {
        onSuccess: () => {
          navigate('/participations');
        },
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !participation) {
    return <ErrorAlert message={t('participations.errorLoadingParticipation')} />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/participations')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('participations.title')} #{participation.id}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/participations/${participationId}/edit`)}
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
              {t('participations.user')}
            </Typography>
            <Typography variant="body1">#{participation.userId}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('participations.context')}
            </Typography>
            <Typography variant="body1">#{participation.contextId}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('participations.startDate')}
            </Typography>
            <Typography variant="body1">
              {format(new Date(participation.startDate), 'dd/MM/yyyy', { locale: ptBR })}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('participations.endDate')}
            </Typography>
            <Typography variant="body1">
              {participation.endDate
                ? format(new Date(participation.endDate), 'dd/MM/yyyy', { locale: ptBR })
                : '-'}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('participations.status')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={participation.active ? t('participations.active') : t('participations.inactive')}
                color={participation.active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </Stack>
      </Paper>

      {reportsData && reportsData.data.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('participations.associatedReports')} ({reportsData.data.length})
          </Typography>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {reportsData.data.map((report) => (
              <Box
                key={report.id}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    {t('reports.title')} #{report.id}
                  </Typography>
                  <Chip
                    label={report.reportType === 'POSITIVE' ? t('reports.positive') : t('reports.negative')}
                    color={report.reportType === 'POSITIVE' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('participations.deleteConfirm')}
        message={t('participations.deleteMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

