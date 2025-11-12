import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useCreateParticipation } from '../hooks/useParticipations';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectUser from '../../../components/common/SelectUser';
import SelectContext from '../../../components/common/SelectContext';
import type { CreateParticipationDto } from '../../../types/participation.types';

const formSchema = z.object({
  userId: z.number().min(1, 'Usuário é obrigatório'),
  contextId: z.number().min(1, 'Contexto é obrigatório'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional(),
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

export default function ParticipationCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      active: true,
    },
  });

  const userId = watch('userId');
  const contextId = watch('contextId');
  const active = watch('active');

  const createMutation = useCreateParticipation();

  const onSubmit = (data: FormData) => {
    setError(null);

    const participationData: CreateParticipationDto = {
      userId: data.userId!,
      contextId: data.contextId!,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      active: data.active,
    };

    createMutation.mutate(participationData, {
      onSuccess: (participation) => {
        navigate(`/participations/${participation.id}`);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err, t('participations.errorCreatingParticipation')));
      },
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('participations.newParticipation')}
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
              required
              error={!!errors.userId}
              helperText={errors.userId?.message}
            />

            <SelectContext
              value={contextId}
              onChange={(id) => setValue('contextId', id || 0)}
              required
              error={!!errors.contextId}
              helperText={errors.contextId?.message}
            />

            <TextField
              {...register('startDate')}
              label={t('participations.startDate')}
              type="date"
              fullWidth
              required
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
                  checked={active ?? true}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('participations.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/participations')}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

