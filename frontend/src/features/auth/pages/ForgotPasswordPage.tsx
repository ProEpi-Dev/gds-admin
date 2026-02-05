import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';
import { authService } from '../../../api/services/auth.service';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useSnackbar } from '../../../hooks/useSnackbar';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type FormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const snackbar = useSnackbar();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await authService.forgotPassword({ email: data.email });
      setSuccess(true);
      snackbar.showSuccess(result.message);
    } catch (err) {
      snackbar.showError(getErrorMessage(err, t('auth.forgotPasswordError')));
    } finally {
      setLoading(false);
    }
  };

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              component={RouterLink}
              to="/login"
            >
              {t('common.back')}
            </Button>
          </Box>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('auth.forgotPasswordTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('auth.forgotPasswordSubtitle')}
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {t('auth.forgotPasswordSuccess')}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register('email')}
              label={t('auth.email')}
              type="email"
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
              autoFocus
              disabled={success}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={success || loading}
            >
              {loading ? <CircularProgress size={24} /> : success ? t('auth.forgotPasswordSent') : t('auth.forgotPasswordSubmit')}
            </Button>
          </Box>

          <Typography variant="body2" align="center">
            <Link component={RouterLink} to="/login">
              {t('auth.backToLogin')}
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
