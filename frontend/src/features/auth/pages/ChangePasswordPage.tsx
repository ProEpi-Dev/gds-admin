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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useChangePassword } from '../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { getErrorMessage } from '../../../utils/errorHandler';

// Schema de validação com regras de segurança
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'A nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
      ),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'A nova senha deve ser diferente da senha atual',
    path: ['newPassword'],
  });

type FormData = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const changePasswordMutation = useChangePassword();

  const onSubmit = (data: FormData) => {
    setError(null);
    setSuccess(false);

    changePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          reset();
          // Redirecionar após 2 segundos
          setTimeout(() => {
            navigate('/');
          }, 2000);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, 'Erro ao alterar senha'));
        },
      },
    );
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              variant="outlined"
            >
              {t('common.back')}
            </Button>
            <Typography variant="h4">{t('auth.changePassword')}</Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success">
              {t('auth.passwordChangedSuccess')}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              <TextField
                {...register('currentPassword')}
                label={t('auth.currentPassword')}
                type="password"
                fullWidth
                error={!!errors.currentPassword}
                helperText={errors.currentPassword?.message}
                autoComplete="current-password"
                autoFocus
              />

              <TextField
                {...register('newPassword')}
                label={t('auth.newPassword')}
                type="password"
                fullWidth
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message || t('auth.passwordRequirements')}
                autoComplete="new-password"
              />

              <TextField
                {...register('confirmPassword')}
                label={t('auth.confirmPassword')}
                type="password"
                fullWidth
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                autoComplete="new-password"
              />

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/')}
                  disabled={changePasswordMutation.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? (
                    <CircularProgress size={24} />
                  ) : (
                    t('auth.changePassword')
                  )}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

