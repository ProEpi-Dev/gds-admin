import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../../../api/services/auth.service';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useTranslation } from '../../../hooks/useTranslation';
import { getErrorMessage } from '../../../utils/errorHandler';

const VERIFY_EMAIL_LOGO_SRC = '/logo_gds.svg';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token')?.trim() ?? '';
  const emailFromUrl = searchParams.get('email')?.trim() ?? '';

  const [email, setEmail] = useState(emailFromUrl);
  const [verifyBusy, setVerifyBusy] = useState(() => Boolean(tokenFromUrl));
  const verifyOnceRef = useRef(false);

  const verifyMutation = useMutation({
    mutationFn: (tok: string) => authService.verifyEmail(tok),
    retry: false,
    onSuccess: (data) => {
      snackbar.showSuccess(data.message || t('auth.verifyEmailSuccess'));
      navigate('/email-verified', { replace: true });
    },
    onSettled: () => {
      setVerifyBusy(false);
    },
  });

  const resendMutation = useMutation({
    mutationFn: (em: string) => authService.requestEmailVerification(em),
    onSuccess: (data) => {
      snackbar.showInfo(data.message || t('auth.verifyEmailResendGeneric'));
    },
    onError: () => {
      snackbar.showError(t('auth.verifyEmailResendError'));
    },
  });

  useEffect(() => {
    verifyMutation.reset();
    verifyOnceRef.current = false;
    setVerifyBusy(Boolean(tokenFromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset estável; deps completas geram reexecução desnecessária
  }, [tokenFromUrl]);

  useEffect(() => {
    if (!tokenFromUrl || verifyOnceRef.current) return;
    verifyOnceRef.current = true;
    setVerifyBusy(true);
    verifyMutation.mutate(tokenFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  const showForm = !tokenFromUrl;
  const verifyFailed = Boolean(tokenFromUrl && verifyMutation.isError);
  const showVerifySpinner = Boolean(tokenFromUrl && verifyBusy);

  const verifyErrorMessage = verifyMutation.error
    ? getErrorMessage(verifyMutation.error, t('auth.verifyEmailError'))
    : null;

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
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Box
              role="img"
              aria-label={t('layout.appTitle')}
              sx={(theme) => ({
                width: 'min(208px, 40%)',
                aspectRatio: '1',
                maxWidth: '100%',
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: '22%',
                boxShadow: '0 10px 28px rgba(15, 111, 115, 0.32)',
                backgroundImage: `url(${VERIFY_EMAIL_LOGO_SRC}), linear-gradient(180deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`,
                backgroundSize: '88% auto, cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              })}
            />
          </Box>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            {t('auth.verifyEmailTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {tokenFromUrl
              ? verifyFailed
                ? t('auth.verifyEmailFailedHint')
                : t('auth.verifyEmailConfirming')
              : t('auth.verifyEmailSubtitle')}
          </Typography>

          {tokenFromUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              {showVerifySpinner ? <CircularProgress size={28} /> : null}
            </Box>
          )}

          {verifyFailed && verifyErrorMessage ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {verifyErrorMessage}
            </Alert>
          ) : null}

          {(showForm || verifyFailed) && (
            <Box component="form" sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                autoComplete="email"
              />
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
                disabled={!email.trim() || resendMutation.isPending}
                onClick={() => resendMutation.mutate(email.trim())}
              >
                {t('auth.verifyEmailResendButton')}
              </Button>
            </Box>
          )}

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            <RouterLink to="/login">{t('auth.backToLogin')}</RouterLink>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
