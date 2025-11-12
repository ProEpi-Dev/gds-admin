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
import { useUser, useUpdateUser } from '../hooks/useUsers';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import type { UpdateUserDto } from '../../../types/user.types';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório').optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const userId = id ? parseInt(id, 10) : null;
  const { data: user, isLoading, error: queryError } = useUser(userId);

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
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        password: '',
        active: user.active,
      });
    }
  }, [user, reset]);

  const updateMutation = useUpdateUser();

  const onSubmit = (data: FormData) => {
    if (!userId) return;

    setError(null);

    const updateData: UpdateUserDto = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (data.password && data.password.trim() !== '') {
      updateData.password = data.password;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    updateMutation.mutate(
      { id: userId, data: updateData },
      {
        onSuccess: () => {
          navigate(`/users/${userId}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, t('users.errorUpdatingUser')));
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !user) {
    return <ErrorAlert message={t('users.errorLoadingUser')} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('common.edit')} {t('users.title')}
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
              label={t('users.name')}
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <TextField
              {...register('email')}
              label={t('users.email')}
              type="email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              {...register('password')}
              label={t('users.password')}
              type="password"
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message || t('users.passwordHelper')}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? false}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('users.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/users/${userId}`)}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

