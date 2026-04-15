import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LoginIcon from '@mui/icons-material/Login';
import { useTranslation } from '../../../hooks/useTranslation';
import { GUARDIOES_PLAY_STORE_URL } from '../../../utils/constants';

const LOGIN_LOGO_SRC = '/logo_gds.svg';

export default function EmailVerifiedPage() {
  const { t } = useTranslation();

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
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box
              role="img"
              aria-label={t('layout.appTitle')}
              sx={(theme) => ({
                width: 'min(160px, 36%)',
                aspectRatio: '1',
                maxWidth: '100%',
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: '22%',
                boxShadow: '0 10px 28px rgba(15, 111, 115, 0.32)',
                bgcolor: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Box
                component="img"
                src={LOGIN_LOGO_SRC}
                alt=""
                sx={{ width: '72%', height: '72%', objectFit: 'contain' }}
              />
            </Box>
          </Box>

          <Typography variant="h5" component="h1" gutterBottom align="center">
            {t('auth.emailVerifiedTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('auth.emailVerifiedSubtitle')}
          </Typography>

          <Stack spacing={2}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              href={GUARDIOES_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNewIcon />}
            >
              {t('auth.emailVerifiedPlayStore')}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              component={RouterLink}
              to="/login"
              startIcon={<LoginIcon />}
            >
              {t('auth.emailVerifiedWebLogin')}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
