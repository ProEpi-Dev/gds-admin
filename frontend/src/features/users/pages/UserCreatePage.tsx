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
import { useCreateUser } from '../hooks/useUsers';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import type { CreateUserDto } from '../../../types/user.types';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function UserCreatePage() {
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

  const active = watch('active');

  const createMutation = useCreateUser();

  const onSubmit = (data: FormData) => {
    setError(null);

    const userData: CreateUserDto = {
      name: data.name,
      email: data.email,
      password: data.password,
      active: data.active,
    };

    createMutation.mutate(userData, {
      onSuccess: (user) => {
        navigate(`/users/${user.id}`);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err, t('users.errorCreatingUser')));
      },
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('users.newUser')}
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
              required
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <TextField
              {...register('email')}
              label={t('users.email')}
              type="email"
              fullWidth
              required
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              {...register('password')}
              label={t('users.password')}
              type="password"
              fullWidth
              required
              error={!!errors.password}
              helperText={errors.password?.message}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? true}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('users.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/users')}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

