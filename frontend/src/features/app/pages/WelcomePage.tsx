import { Box, Typography, Paper, Button, Chip, Container, Divider, List, ListItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import { CheckCircle as CheckCircleIcon, PhoneAndroid as PhoneAndroidIcon, CheckCircle as CheckCircleDoneIcon, RadioButtonUnchecked as PendingIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../../components/layout/UserLayout';
import { TrackProgressService } from '../../../api/services/track-progress.service';

export default function WelcomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const participationId = user?.participation?.id;

  const { data: compliance, isLoading: complianceLoading } = useQuery({
    queryKey: ['mandatory-compliance', participationId],
    queryFn: () => TrackProgressService.getMandatoryCompliance(participationId!).then((r) => r.data),
    enabled: !!participationId,
  });

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

          {/* Conformidade de trilhas obrigatórias */}
          {user?.participation && (
            <>
              {complianceLoading ? (
                <Paper elevation={0} sx={{ p: 3, mb: 4, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={28} />
                  </Box>
                </Paper>
              ) : compliance && compliance.totalRequired > 0 ? (
                <Paper elevation={0} sx={{ p: 3, mb: 4, border: 1, borderColor: 'divider', borderRadius: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Trilhas obrigatórias
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {compliance.completedCount} de {compliance.totalRequired} concluídas
                  </Typography>
                  <List dense disablePadding>
                    {compliance.items.map((item) => (
                      <ListItem key={item.mandatorySlug} disablePadding sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {item.completed ? (
                            <CheckCircleDoneIcon color="success" fontSize="small" />
                          ) : (
                            <PendingIcon color="action" fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          secondary={item.completed ? 'Concluída' : 'Pendente'}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption', color: item.completed ? 'success.main' : 'text.secondary' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              ) : compliance && compliance.totalRequired === 0 ? null : null}
            </>
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
