import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Paper, Alert } from '@mui/material';
import MaintenanceWindowForm from '../components/MaintenanceWindowForm';
import {
  useMaintenanceWindow,
  useUpdateMaintenanceWindow,
} from '../hooks/useMaintenanceWindows';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSnackbar } from '../../../hooks/useSnackbar';
import type { CreateMaintenanceWindowDto } from '../../../types/maintenance-window.types';

export default function MaintenanceWindowEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const snackbar = useSnackbar();
  const [error, setError] = useState<string | null>(null);

  const windowId = id ? parseInt(id, 10) : null;
  const {
    data: window,
    isLoading,
    error: queryError,
  } = useMaintenanceWindow(windowId);

  const updateMutation = useUpdateMaintenanceWindow();

  const onSubmit = (dto: CreateMaintenanceWindowDto) => {
    if (!windowId) return;
    setError(null);

    updateMutation.mutate(
      { id: windowId, data: dto },
      {
        onSuccess: () => {
          snackbar.showSuccess(t('maintenanceWindows.updateSuccess'));
          navigate('/maintenance-windows');
        },
        onError: (err: unknown) => {
          const errorMessage = getErrorMessage(
            err,
            t('maintenanceWindows.errorUpdating'),
          );
          setError(errorMessage);
          snackbar.showError(errorMessage);
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !window) {
    return <ErrorAlert message={t('maintenanceWindows.errorLoading')} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('common.edit')} — {t('maintenanceWindows.title')}
      </Typography>

      <Paper sx={{ p: 3, mt: 3, maxWidth: 720 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <MaintenanceWindowForm
          initialValues={window}
          onSubmit={onSubmit}
          onCancel={() => navigate('/maintenance-windows')}
          submitting={updateMutation.isPending}
          submitLabel={t('common.save')}
        />
      </Paper>
    </Box>
  );
}
