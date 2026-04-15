import { Box, Container, Paper, Typography, Link } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { contextsService } from '../../../api/services/contexts.service';
import { useTranslation } from '../../../hooks/useTranslation';

const LOGIN_LOGO_SRC = '/logo_gds.svg';

export default function LoginPage() {
  const { t } = useTranslation();
  const { data: publicContexts } = useQuery({
    queryKey: ['auth', 'public-contexts-for-signup'],
    queryFn: () => contextsService.findPublicForSignup(),
  });
  const hasPublicSignup = (publicContexts?.data?.length ?? 0) > 0;

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
                backgroundImage: `url(${LOGIN_LOGO_SRC}), linear-gradient(180deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`,
                backgroundSize: '88% auto, cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              })}
            />
          </Box>
          <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ fontWeight: 600 }}>
            Guardiões da Saúde
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Faça login para continuar
          </Typography>
          <LoginForm />
          {hasPublicSignup && (
            <Typography variant="body2" align="center" sx={{ mt: 2 }}>
              Não tem conta?{' '}
              <Link
                component={RouterLink}
                to="/signup"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Cadastre-se
              </Link>
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

