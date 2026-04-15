import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  useContextConfiguration,
  useUpsertContextConfiguration,
} from '../hooks/useContexts';
import { getErrorMessage } from '../../../utils/errorHandler';

const NUMERIC_KEYS = new Set([
  'negative_report_dedup_window_min',
  'negative_block_if_positive_within_min',
]);

const BOOLEAN_CONFIG_KEYS = new Set([
  'social_sso_enabled',
  'require_email_verification',
  'profile_require_gender',
  'profile_require_country',
  'profile_require_location',
  'profile_require_external_identifier',
  'profile_require_phone',
]);

type Props = {
  contextId: number;
};

export default function ContextConfigurationTab({ contextId }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, error, isFetching } = useContextConfiguration(
    contextId,
  );
  const upsert = useUpsertContextConfiguration(contextId);

  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts({});
    setJsonDrafts({});
  }, [data]);

  const entries = useMemo(() => data ?? [], [data]);

  const displayValue = (key: string, server: unknown): unknown => {
    if (Object.prototype.hasOwnProperty.call(drafts, key)) {
      return drafts[key];
    }
    return server;
  };

  const setDraft = (key: string, value: unknown) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const renderEditor = (key: string, serverValue: unknown) => {
    const value = displayValue(key, serverValue);

    if (BOOLEAN_CONFIG_KEYS.has(key)) {
      return (
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(value)}
              onChange={(_, checked) => setDraft(key, checked)}
            />
          }
          label={value ? t('common.yes') : t('common.no')}
        />
      );
    }

    if (key === 'allowed_email_domains') {
      const text = Array.isArray(value)
        ? (value as string[]).join(', ')
        : '';
      return (
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label={t('contexts.configDomainsLabel')}
          placeholder="exemplo.gov.cv, outro.org"
          value={text}
          onChange={(e) => {
            const parts = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            setDraft(key, parts);
          }}
        />
      );
    }

    if (NUMERIC_KEYS.has(key)) {
      const n = typeof value === 'number' ? value : Number(value);
      return (
        <TextField
          fullWidth
          size="small"
          type="number"
          inputProps={{ min: 1, step: 1 }}
          label={t('contexts.configMinutesLabel')}
          value={Number.isFinite(n) ? String(Math.floor(n)) : ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              setDraft(key, '');
              return;
            }
            setDraft(key, parseInt(raw, 10));
          }}
        />
      );
    }

    const jsonKey = `__json__${key}`;
    const jsonText =
      jsonDrafts[jsonKey] ??
      (() => {
        try {
          return JSON.stringify(value ?? null, null, 2);
        } catch {
          return '';
        }
      })();

    return (
      <TextField
        fullWidth
        size="small"
        multiline
        minRows={4}
        label={t('contexts.configJsonLabel')}
        value={jsonText}
        onChange={(e) => {
          const next = e.target.value;
          setJsonDrafts((prev) => ({ ...prev, [jsonKey]: next }));
          try {
            setDraft(key, JSON.parse(next));
          } catch {
            setDraft(key, undefined);
          }
        }}
        helperText={t('contexts.configJsonHelper')}
        InputProps={{ sx: { fontFamily: 'monospace' } }}
      />
    );
  };

  const handleSave = async (key: string, serverValue: unknown) => {
    setSaveError(null);
    let payload: unknown = displayValue(key, serverValue);

    if (NUMERIC_KEYS.has(key)) {
      const n =
        typeof payload === 'number' ? payload : parseInt(String(payload), 10);
      if (!Number.isFinite(n) || n < 1) {
        setSaveError(t('contexts.configInvalidPositiveInt'));
        return;
      }
      payload = Math.floor(n);
    }

    if (key === 'allowed_email_domains') {
      if (!Array.isArray(payload)) {
        setSaveError(t('contexts.configInvalidDomains'));
        return;
      }
    }

    if (
      (key === 'social_sso_enabled' || key === 'require_email_verification') &&
      typeof payload !== 'boolean'
    ) {
      setSaveError(t('contexts.configInvalidBoolean'));
      return;
    }

    if (payload === undefined && !NUMERIC_KEYS.has(key)) {
      setSaveError(t('contexts.configInvalidJson'));
      return;
    }

    try {
      await upsert.mutateAsync({ key, value: payload });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setJsonDrafts((prev) => {
        const next = { ...prev };
        delete next[`__json__${key}`];
        return next;
      });
    } catch (err) {
      setSaveError(getErrorMessage(err, t('contexts.configSaveError')));
    }
  };

  const isDirty = (key: string, serverValue: unknown) =>
    Object.prototype.hasOwnProperty.call(drafts, key) &&
    JSON.stringify(drafts[key]) !== JSON.stringify(serverValue);

  const numericSaveDisabled = (key: string, serverValue: unknown) => {
    if (!NUMERIC_KEYS.has(key)) return false;
    const v = displayValue(key, serverValue);
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    return !Number.isFinite(n) || n < 1;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 1 }}>
        {t('contexts.configLoadError')}
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t('contexts.configIntro')}
      </Typography>

      {saveError && (
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
          {t('contexts.configEmpty')}
        </Typography>
      ) : (
        entries.map((row) => {
          const helpText = t(`contexts.configKeyHelp.${row.key}`, {
            defaultValue: '',
          });
          return (
            <Box
              key={row.key}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                {row.key}
              </Typography>
              {helpText ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mb: 1 }}
                >
                  {helpText}
                </Typography>
              ) : null}

              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {renderEditor(row.key, row.value)}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={
                      !isDirty(row.key, row.value) ||
                      upsert.isPending ||
                      numericSaveDisabled(row.key, row.value)
                    }
                    onClick={() => handleSave(row.key, row.value)}
                  >
                    {t('contexts.configSave')}
                  </Button>
                </Box>
              </Stack>
            </Box>
          );
        })
      )}

      {isFetching && !isLoading ? (
        <Typography variant="caption" color="text.secondary">
          {t('common.loading')}
        </Typography>
      ) : null}
    </Stack>
  );
}
