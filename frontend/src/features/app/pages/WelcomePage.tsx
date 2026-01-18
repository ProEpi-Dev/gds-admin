import { Box, Typography, Paper, Button, Chip, Container, Divider } from '@mui/material';
import { CheckCircle as CheckCircleIcon, PhoneAndroid as PhoneAndroidIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../../components/layout/UserLayout';

export default function WelcomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <UserLayout>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', py: 6 }}>
          {/* Ícone de sucesso */}
          <CheckCircleIcon 
            color="success" 
            sx={{ fontSize: 100, mb: 3 }} 
          />
          
          {/* Título principal */}
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('welcome.title')}
          </Typography>
          
          {/* Subtítulo */}
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ mb: 5, fontWeight: 400 }}
          >
            {t('welcome.subtitle')}
          </Typography>

          {/* Card do contexto */}
          {user?.participation && (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                mb: 4, 
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('welcome.message')}
              </Typography>
              <Chip 
                label={user.participation.context.name} 
                color="primary" 
                sx={{ 
                  mt: 2, 
                  fontSize: '1rem', 
                  height: 40,
                  fontWeight: 500,
                }} 
              />
            </Paper>
          )}

          <Divider sx={{ my: 5 }} />

          {/* Mensagem sobre o app */}
          <Box sx={{ mb: 4 }}>
            <PhoneAndroidIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" color="text.secondary" paragraph>
              {t('welcome.appMessage')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Aplicativo Android em breve disponível
            </Typography>
          </Box>

          {/* Botão de perfil */}
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/app/profile')}
            fullWidth
            sx={{ mt: 3 }}
          >
            {t('welcome.viewProfile')}
          </Button>
        </Box>
      </Container>
    </UserLayout>
  );
}
