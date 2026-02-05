import { useState } from 'react';
import { Link as RouterLink, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';
import { authService } from '../../../api/services/auth.service';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useSnackbar } from '../../../hooks/useSnackbar';

const resetPasswordSchema = z
  .object({
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
  });

type FormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const snackbar = useSnackbar();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setError(null);
    try {
      await authService.resetPassword({
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      snackbar.showSuccess(t('auth.resetPasswordSuccess'));
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(getErrorMessage(err, t('auth.resetPasswordError')));
    }
  };

  if (!token) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('auth.resetPasswordInvalidToken')}
            </Alert>
            <Typography variant="body2" align="center">
              <Link component={RouterLink} to="/forgot-password">
                {t('auth.requestNewReset')}
              </Link>
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('auth.resetPasswordTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('auth.resetPasswordSubtitle')}
          </Typography>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {t('auth.resetPasswordSuccess')}. {t('auth.redirectingToLogin')}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField
                {...register('newPassword')}
                label={t('auth.newPassword')}
                type={showNewPassword ? 'text' : 'password'}
                fullWidth
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message || t('auth.passwordRequirements')}
                autoComplete="new-password"
                autoFocus
                disabled={success}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                        disabled={success}
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                {...register('confirmPassword')}
                label={t('auth.confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                autoComplete="new-password"
                disabled={success}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                        disabled={success}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
                disabled={success}
              >
                {success ? <CircularProgress size={24} /> : t('auth.resetPasswordSubmit')}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            <Link component={RouterLink} to="/login">
              {t('auth.backToLogin')}
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
