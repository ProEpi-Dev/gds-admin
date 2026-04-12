import { Box, Container, Paper, Typography, Link } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { contextsService } from '../../../api/services/contexts.service';

export default function LoginPage() {
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
          <Typography variant="h4" component="h1" gutterBottom align="center">
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

