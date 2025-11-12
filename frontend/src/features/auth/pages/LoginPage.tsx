import { Box, Container, Paper, Typography } from '@mui/material';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
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
            Guardiões da Saúde - Admin
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Faça login para continuar
          </Typography>
          <LoginForm />
        </Paper>
      </Box>
    </Container>
  );
}

