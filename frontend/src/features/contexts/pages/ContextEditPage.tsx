import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useContext as useContextQuery, useUpdateContext } from '../hooks/useContexts';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import SelectLocation from '../../../components/common/SelectLocation';
import { useTranslation } from '../../../hooks/useTranslation';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { UpdateContextDto } from '../../../types/context.types';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  locationId: z.number().optional().nullable(),
  accessType: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  description: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ContextEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const contextId = id ? parseInt(id, 10) : null;
  const {
    data: context,
    isLoading,
    error: queryError,
  } = useContextQuery(contextId);

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

  const locationId = watch('locationId');
  const active = watch('active');

  useEffect(() => {
    if (context) {
      reset({
        name: context.name,
        locationId: context.locationId,
        accessType: context.accessType,
        description: context.description ?? '',
        type: context.type ?? '',
        active: context.active,
      });
    }
  }, [context, reset]);

  const updateMutation = useUpdateContext();

  const onSubmit = (data: FormData) => {
    if (!contextId) return;

    setError(null);

    const updateData: UpdateContextDto = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.locationId !== undefined) {
      updateData.locationId = data.locationId || undefined;
    }

    if (data.accessType !== undefined) {
      updateData.accessType = data.accessType;
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() ? data.description : undefined;
    }

    if (data.type !== undefined) {
      updateData.type = data.type?.trim() ? data.type : undefined;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    updateMutation.mutate(
      { id: contextId, data: updateData },
      {
        onSuccess: () => {
          navigate(`/contexts/${contextId}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, t('contexts.errorUpdatingContext')));
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !context) {
    return <ErrorAlert message={t('contexts.errorLoadingContext')} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('common.edit')} {t('contexts.title')}
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              {...register('name')}
              label={t('contexts.name')}
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <SelectLocation
              value={locationId ?? null}
              onChange={(value) => setValue('locationId', value)}
              label={t('contexts.location')}
              activeOnly={false}
            />

            <FormControl fullWidth error={!!errors.accessType}>
              <InputLabel>{t('contexts.accessType')}</InputLabel>
              <Select {...register('accessType')} label={t('contexts.accessType')} defaultValue="">
                <MenuItem value="PUBLIC">{t('contexts.accessTypePublic')}</MenuItem>
                <MenuItem value="PRIVATE">{t('contexts.accessTypePrivate')}</MenuItem>
              </Select>
              {errors.accessType && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.accessType.message}
                </Typography>
              )}
            </FormControl>

            <TextField
              {...register('description')}
              label={t('contexts.description')}
              fullWidth
              multiline
              minRows={3}
              error={!!errors.description}
              helperText={errors.description?.message}
            />

            <TextField
              {...register('type')}
              label={t('contexts.type')}
              fullWidth
              error={!!errors.type}
              helperText={errors.type?.message}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? false}
                  onChange={(event) => setValue('active', event.target.checked)}
                />
              }
              label={t('contexts.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/contexts/${contextId}`)}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}


