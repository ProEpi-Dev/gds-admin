import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Alert } from '@mui/material';
import MaintenanceWindowForm from '../components/MaintenanceWindowForm';
import { useCreateMaintenanceWindow } from '../hooks/useMaintenanceWindows';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSnackbar } from '../../../hooks/useSnackbar';
import type { CreateMaintenanceWindowDto } from '../../../types/maintenance-window.types';

export default function MaintenanceWindowCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const snackbar = useSnackbar();
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateMaintenanceWindow();

  const onSubmit = (dto: CreateMaintenanceWindowDto) => {
    setError(null);

    createMutation.mutate(dto, {
      onSuccess: (window) => {
        snackbar.showSuccess(t('maintenanceWindows.createSuccess'));
        navigate(`/maintenance-windows/${window.id}/edit`);
      },
      onError: (err: unknown) => {
        const errorMessage = getErrorMessage(
          err,
          t('maintenanceWindows.errorCreating'),
        );
        setError(errorMessage);
        snackbar.showError(errorMessage);
      },
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('maintenanceWindows.newWindow')}
      </Typography>

      <Paper sx={{ p: 3, mt: 3, maxWidth: 720 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <MaintenanceWindowForm
          onSubmit={onSubmit}
          onCancel={() => navigate('/maintenance-windows')}
          submitting={createMutation.isPending}
          submitLabel={t('common.save')}
        />
      </Paper>
    </Box>
  );
}
