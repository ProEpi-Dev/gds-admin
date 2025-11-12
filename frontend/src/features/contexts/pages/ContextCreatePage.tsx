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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useCreateContext } from '../hooks/useContexts';
import SelectLocation from '../../../components/common/SelectLocation';
import { useTranslation } from '../../../hooks/useTranslation';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { CreateContextDto } from '../../../types/context.types';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  locationId: z.number().optional().nullable(),
  accessType: z.enum(['PUBLIC', 'PRIVATE']),
  description: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ContextCreatePage() {
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
      name: '',
      locationId: null,
      accessType: 'PUBLIC',
      description: '',
      type: '',
      active: true,
    },
  });

  const locationId = watch('locationId');
  const active = watch('active');

  const createMutation = useCreateContext();

  const onSubmit = (data: FormData) => {
    setError(null);

    const contextData: CreateContextDto = {
      name: data.name,
      accessType: data.accessType,
      locationId: data.locationId || undefined,
      description: data.description?.trim() ? data.description : undefined,
      type: data.type?.trim() ? data.type : undefined,
      active: data.active,
    };

    createMutation.mutate(contextData, {
      onSuccess: (context) => {
        navigate(`/contexts/${context.id}`);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err, t('contexts.errorCreatingContext')));
      },
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('contexts.newContext')}
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
              required
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <SelectLocation
              value={locationId ?? null}
              onChange={(id) => setValue('locationId', id)}
              label={t('contexts.location')}
              activeOnly={false}
            />

            <FormControl fullWidth required error={!!errors.accessType}>
              <InputLabel>{t('contexts.accessType')}</InputLabel>
              <Select
                {...register('accessType')}
                label={t('contexts.accessType')}
                defaultValue="PUBLIC"
              >
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
                  checked={active ?? true}
                  onChange={(event) => setValue('active', event.target.checked)}
                />
              }
              label={t('contexts.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/contexts')}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}


