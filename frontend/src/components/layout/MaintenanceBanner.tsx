import { Alert, AlertTitle, Box, Typography } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import { useMaintenanceStatus } from '../../features/maintenance-windows/hooks/useMaintenanceWindows';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDateTimeFromApi } from '../../utils/formatDateOnlyFromApi';

/**
 * Aviso global de janela de indisponibilidade, exibido em qualquer modo.
 *
 * Em `full` e `read_only` o console já falha sozinho, mas com erros genéricos
 * espalhados por tela; o banner é o que explica o motivo. Em `banner` nada
 * falha, então ele é a única indicação de que existe uma janela.
 */
export default function MaintenanceBanner() {
  const { t, currentLanguage } = useTranslation();
  const { data } = useMaintenanceStatus();

  if (!data?.inMaintenance) {
    return null;
  }

  // `banner` é aviso; os outros dois bloqueiam de fato a API.
  const isBlocking = data.mode !== 'banner';
  const period = data.endsAt
    ? `${formatDateTimeFromApi(data.startsAt, currentLanguage)} → ${formatDateTimeFromApi(data.endsAt, currentLanguage)}`
    : `${formatDateTimeFromApi(data.startsAt, currentLanguage)} → ${t('maintenanceWindows.noEndDateShort')}`;

  return (
    <Alert
      severity={isBlocking ? 'error' : 'warning'}
      variant="filled"
      icon={<BuildIcon />}
      square
      sx={{
        borderRadius: 0,
        alignItems: 'center',
        '& .MuiAlert-message': { width: '100%' },
      }}
    >
      <AlertTitle sx={{ fontWeight: 700, mb: 0.5 }}>
        {data.title || t('maintenanceWindows.bannerFallbackTitle')}
        {' — '}
        {t(`maintenanceWindows.modes.${data.mode}`)}
      </AlertTitle>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2">{data.message}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {period}
        </Typography>
      </Box>
      {isBlocking && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {t('maintenanceWindows.bannerBlockingHint')}
        </Typography>
      )}
    </Alert>
  );
}
