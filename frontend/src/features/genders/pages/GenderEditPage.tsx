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
import { useGender, useUpdateGender } from '../hooks/useGenders';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSnackbar } from '../../../hooks/useSnackbar';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome deve ter no máximo 50 caracteres'),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function GenderEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const snackbar = useSnackbar();
  const [error, setError] = useState<string | null>(null);

  const genderId = id ? parseInt(id, 10) : null;
  const { data: gender, isLoading, error: queryError } = useGender(genderId);

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

  const active = watch('active');

  useEffect(() => {
    if (gender) {
      reset({
        name: gender.name,
        active: gender.active,
      });
    }
  }, [gender, reset]);

  const updateMutation = useUpdateGender();

  const onSubmit = (data: FormData) => {
    if (!genderId) return;

    setError(null);

    updateMutation.mutate(
      {
        id: genderId,
        data: {
          name: data.name,
          active: data.active,
        },
      },
      {
        onSuccess: () => {
          snackbar.showSuccess(t('genders.updateSuccess'));
          navigate(`/genders/${genderId}`);
        },
        onError: (err: unknown) => {
          const errorMessage = getErrorMessage(err, t('genders.errorUpdating'));
          setError(errorMessage);
          snackbar.showError(errorMessage);
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !gender) {
    return <ErrorAlert message={t('genders.errorLoading')} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('common.edit')} {t('genders.title')}
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
                  checked={active ?? false}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('genders.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/genders/${genderId}`)}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
