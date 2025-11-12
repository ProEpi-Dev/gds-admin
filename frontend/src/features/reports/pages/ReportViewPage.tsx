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
import { useReport, useDeleteReport } from '../hooks/useReports';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTranslation } from '../../../hooks/useTranslation';

export default function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const reportId = id ? parseInt(id, 10) : null;
  const { data: report, isLoading, error } = useReport(reportId);

  const deleteMutation = useDeleteReport();

  const handleDelete = () => {
    if (reportId) {
      deleteMutation.mutate(reportId, {
        onSuccess: () => {
          navigate('/reports');
        },
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !report) {
    return <ErrorAlert message={t('reports.errorLoadingReport')} />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/reports')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('reports.title')} #{report.id}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/reports/${reportId}/edit`)}
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
              {t('reports.participation')}
            </Typography>
            <Typography variant="body1">#{report.participationId}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('reports.formVersion')}
            </Typography>
            <Typography variant="body1">#{report.formVersionId}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('reports.type')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={report.reportType === 'POSITIVE' ? t('reports.positive') : t('reports.negative')}
                color={report.reportType === 'POSITIVE' ? 'success' : 'error'}
                size="small"
              />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('reports.status')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={report.active ? t('reports.active') : t('reports.inactive')}
                color={report.active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          {report.occurrenceLocation && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Localização da Ocorrência
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
                  <pre>{JSON.stringify(report.occurrenceLocation, null, 2)}</pre>
                </Paper>
              </Box>
            </>
          )}

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Resposta do Formulário
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
              <pre>{JSON.stringify(report.formResponse, null, 2)}</pre>
            </Paper>
          </Box>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('reports.deleteConfirm')}
        message={t('reports.deleteMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

