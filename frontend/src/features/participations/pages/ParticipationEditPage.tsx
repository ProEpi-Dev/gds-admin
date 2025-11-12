import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useParticipation, useUpdateParticipation } from '../hooks/useParticipations';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectUser from '../../../components/common/SelectUser';
import SelectContext from '../../../components/common/SelectContext';
import type { UpdateParticipationDto } from '../../../types/participation.types';

const formSchema = z.object({
  userId: z.number().min(1, 'Usuário é obrigatório').optional(),
  contextId: z.number().min(1, 'Contexto é obrigatório').optional(),
  startDate: z.string().min(1, 'Data de início é obrigatória').optional(),
  endDate: z.string().optional().nullable(),
  active: z.boolean().optional(),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'Data de término deve ser maior ou igual à data de início',
  path: ['endDate'],
});

type FormData = z.infer<typeof formSchema>;

export default function ParticipationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const participationId = id ? parseInt(id, 10) : null;
  const { data: participation, isLoading, error: queryError } = useParticipation(participationId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const userId = watch('userId');
  const contextId = watch('contextId');
  const active = watch('active');

  useEffect(() => {
    if (participation) {
      reset({
        userId: participation.userId,
        contextId: participation.contextId,
        startDate: participation.startDate.split('T')[0], // Formato YYYY-MM-DD
        endDate: participation.endDate ? participation.endDate.split('T')[0] : '',
        active: participation.active,
      });
    }
  }, [participation, reset]);

  const updateMutation = useUpdateParticipation();

  const onSubmit = (data: FormData) => {
    if (!participationId) return;

    setError(null);

    const updateData: UpdateParticipationDto = {};

    if (data.userId !== undefined) {
      updateData.userId = data.userId;
    }

    if (data.contextId !== undefined) {
      updateData.contextId = data.contextId;
    }

    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate;
    }

    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate || null;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    updateMutation.mutate(
      { id: participationId, data: updateData },
      {
        onSuccess: () => {
          navigate(`/participations/${participationId}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, t('participations.errorUpdatingParticipation')));
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !participation) {
    return <ErrorAlert message={t('participations.errorLoadingParticipation')} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('common.edit')} {t('participations.title')}
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <SelectUser
              value={userId}
              onChange={(id) => setValue('userId', id || 0)}
              error={!!errors.userId}
              helperText={errors.userId?.message}
            />

            <SelectContext
              value={contextId}
              onChange={(id) => setValue('contextId', id || 0)}
              error={!!errors.contextId}
              helperText={errors.contextId?.message}
            />

            <TextField
              {...register('startDate')}
              label={t('participations.startDate')}
              type="date"
              fullWidth
              error={!!errors.startDate}
              helperText={errors.startDate?.message}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              {...register('endDate')}
              label={t('participations.endDate')}
              type="date"
              fullWidth
              error={!!errors.endDate}
              helperText={errors.endDate?.message}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? false}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('participations.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/participations/${participationId}`)}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

