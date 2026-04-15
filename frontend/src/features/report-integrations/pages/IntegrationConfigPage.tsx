import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
} from '@mui/material';
import {
  useIntegrationConfig,
  useUpsertIntegrationConfig,
} from '../hooks/useReportIntegrations';
import { useCurrentContext } from '../../../contexts/CurrentContextContext';
import { formatDateTimeFromApi } from '../../../utils/formatDateOnlyFromApi';

export default function IntegrationConfigPage() {
  const { currentContext } = useCurrentContext();
  const contextId = currentContext?.id ?? null;

  const { data: config, isLoading } = useIntegrationConfig(contextId);
  const upsertMutation = useUpsertIntegrationConfig();

  const [baseUrlProduction, setBaseUrlProduction] = useState('');
  const [baseUrlHomologation, setBaseUrlHomologation] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [templateId, setTemplateId] = useState('/1');
  const [templateFieldKey, setTemplateFieldKey] = useState(
    'eventoIntegracaoTemplate',
  );
  const [userIdFieldKey, setUserIdFieldKey] = useState('userId');
  const [userEmailFieldKey, setUserEmailFieldKey] = useState('userEmail');
  const [userNameFieldKey, setUserNameFieldKey] = useState('userName');
  const [userPhoneFieldKey, setUserPhoneFieldKey] = useState('userPhone');
  const [userCountryFieldKey, setUserCountryFieldKey] = useState('userCountry');
  const [eventSourceIdFieldKey, setEventSourceIdFieldKey] =
    useState('eventSourceId');
  const [eventSourceLocationFieldKey, setEventSourceLocationFieldKey] =
    useState('eventSourceLocation');
  const [eventSourceLocationIdFieldKey, setEventSourceLocationIdFieldKey] =
    useState('eventSourceLocationId');
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [maxRetries, setMaxRetries] = useState(3);
  const [isActive, setIsActive] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setBaseUrlProduction(config.baseUrlProduction ?? '');
      setBaseUrlHomologation(config.baseUrlHomologation ?? '');
      setAuthToken('');
      setTemplateId(config.templateId ?? '/1');
      setTemplateFieldKey(config.templateFieldKey ?? 'eventoIntegracaoTemplate');
      setUserIdFieldKey(config.userIdFieldKey ?? 'userId');
      setUserEmailFieldKey(config.userEmailFieldKey ?? 'userEmail');
      setUserNameFieldKey(config.userNameFieldKey ?? 'userName');
      setUserPhoneFieldKey(config.userPhoneFieldKey ?? 'userPhone');
      setUserCountryFieldKey(config.userCountryFieldKey ?? 'userCountry');
      setEventSourceIdFieldKey(config.eventSourceIdFieldKey ?? 'eventSourceId');
      setEventSourceLocationFieldKey(
        config.eventSourceLocationFieldKey ?? 'eventSourceLocation',
      );
      setEventSourceLocationIdFieldKey(
        config.eventSourceLocationIdFieldKey ?? 'eventSourceLocationId',
      );
      setTimeoutMs(config.timeoutMs);
      setMaxRetries(config.maxRetries);
      setIsActive(config.isActive);
    }
  }, [config]);

  const handleSave = () => {
    if (!contextId) return;

    const dto: any = {
      timeoutMs,
      maxRetries,
      isActive,
      templateId,
      templateFieldKey,
      userIdFieldKey,
      userEmailFieldKey,
      userNameFieldKey,
      userPhoneFieldKey,
      userCountryFieldKey,
      eventSourceIdFieldKey,
      eventSourceLocationFieldKey,
      eventSourceLocationIdFieldKey,
    };

    if (baseUrlProduction) dto.baseUrlProduction = baseUrlProduction;
    if (baseUrlHomologation) dto.baseUrlHomologation = baseUrlHomologation;
    if (authToken) {
      dto.authConfig = { type: 'static_token', token: authToken };
    }

    upsertMutation.mutate(
      { contextId, dto },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        },
      },
    );
  };

  if (!currentContext) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Configuração de integração
        </Typography>
        <Alert severity="info">
          Selecione um contexto no cabeçalho para configurar a integração.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configuração de integração
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Contexto: <strong>{currentContext.name}</strong>
      </Typography>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ p: 3, mt: 2 }}>
          {config && (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={`Versão ${config.version}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={config.isActive ? 'Ativa' : 'Inativa'}
                  size="small"
                  color={config.isActive ? 'success' : 'default'}
                />
                <Typography variant="caption" color="text.secondary">
                  Atualizada em {formatDateTimeFromApi(config.updatedAt, 'pt-BR')}
                </Typography>
              </Stack>
            </Box>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Configuração salva com sucesso (nova versão criada)
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              label="URL de Produção"
              value={baseUrlProduction}
              onChange={(e) => setBaseUrlProduction(e.target.value)}
              fullWidth
              placeholder="https://api-integracao.example.com"
              helperText="Endpoint base da API de integração (produção)"
            />

            <TextField
              label="URL de Homologação"
              value={baseUrlHomologation}
              onChange={(e) => setBaseUrlHomologation(e.target.value)}
              fullWidth
              placeholder="https://api-integracao-homolog.example.com"
              helperText="Usado para participantes em modo treinamento"
            />

            <Divider />

            <TextField
              label="Token de autenticação"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              fullWidth
              type="password"
              helperText={
                config?.authConfig
                  ? 'Token já salvo. Preencha para substituir.'
                  : 'Token estático para autenticação na API externa'
              }
            />

            <Divider />

            <Alert severity="info">
              O mapeamento de campos agora é automático: usamos a definição ativa do
              formulário de sinal (chave -&gt; label), como no legado Ruby.
            </Alert>

            <Divider />

            <Typography variant="subtitle2">
              Contrato do payload (campos de envelope)
            </Typography>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Valor do template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                sx={{ flex: 1 }}
                helperText="Ex.: /1"
              />
              <TextField
                label="Chave do template"
                value={templateFieldKey}
                onChange={(e) => setTemplateFieldKey(e.target.value)}
                sx={{ flex: 1 }}
                helperText="Ex.: eventoIntegracaoTemplate"
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Chave userId"
                value={userIdFieldKey}
                onChange={(e) => setUserIdFieldKey(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Chave userEmail"
                value={userEmailFieldKey}
                onChange={(e) => setUserEmailFieldKey(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Chave userName"
                value={userNameFieldKey}
                onChange={(e) => setUserNameFieldKey(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Chave userPhone"
                value={userPhoneFieldKey}
                onChange={(e) => setUserPhoneFieldKey(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Chave userCountry"
                value={userCountryFieldKey}
                onChange={(e) => setUserCountryFieldKey(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Chave eventSourceId"
                value={eventSourceIdFieldKey}
                onChange={(e) => setEventSourceIdFieldKey(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Chave eventSourceLocation"
                value={eventSourceLocationFieldKey}
                onChange={(e) =>
                  setEventSourceLocationFieldKey(e.target.value)
                }
                sx={{ flex: 1 }}
              />
              <TextField
                label="Chave eventSourceLocationId"
                value={eventSourceLocationIdFieldKey}
                onChange={(e) =>
                  setEventSourceLocationIdFieldKey(e.target.value)
                }
                sx={{ flex: 1 }}
              />
            </Stack>

            <Alert severity="info">
              Os blocos <strong>data</strong> e <strong>aditionalData</strong>{' '}
              permanecem fixos e são enviados automaticamente.
            </Alert>

            <Divider />

            <Stack direction="row" spacing={3}>
              <TextField
                label="Timeout (ms)"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value) || 30000)}
                type="number"
                sx={{ width: 200 }}
              />

              <TextField
                label="Máximo de retentativas"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value) || 3)}
                type="number"
                sx={{ width: 200 }}
              />
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              }
              label="Integração ativa"
            />

            <Box>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={upsertMutation.isPending}
              >
                {upsertMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  'Salvar configuração'
                )}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
