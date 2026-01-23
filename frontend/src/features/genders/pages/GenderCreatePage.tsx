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
import { useCreateGender } from '../hooks/useGenders';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSnackbar } from '../../../hooks/useSnackbar';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome deve ter no máximo 50 caracteres'),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function GenderCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const snackbar = useSnackbar();
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

  const active = watch('active');

  const createMutation = useCreateGender();

  const onSubmit = (data: FormData) => {
    setError(null);

    createMutation.mutate(
      {
        name: data.name,
      },
      {
        onSuccess: (gender) => {
          snackbar.showSuccess(t('genders.createSuccess'));
          navigate(`/genders/${gender.id}`);
        },
        onError: (err: unknown) => {
          const errorMessage = getErrorMessage(err, t('genders.errorCreating'));
          setError(errorMessage);
          snackbar.showError(errorMessage);
        },
      },
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('genders.newGender')}
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
              label={t('genders.name')}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? true}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('genders.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/genders')}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
