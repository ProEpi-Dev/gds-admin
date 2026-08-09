import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
  FormControlLabel,
  Switch,
  Checkbox,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useTranslation } from '../../../hooks/useTranslation';
import type {
  CreateMaintenanceWindowDto,
  MaintenanceMode,
  MaintenanceWindow,
} from '../../../types/maintenance-window.types';
import {
  datetimeLocalValueToIso,
  isoToDatetimeLocalValue,
} from '../utils/datetimeLocal';

const MODE_OPTIONS: {
  value: MaintenanceMode;
  labelKey: string;
  descriptionKey: string;
}[] = [
  {
    value: 'banner',
    labelKey: 'maintenanceWindows.modes.banner',
    descriptionKey: 'maintenanceWindows.modeDescriptions.banner',
  },
  {
    value: 'read_only',
    labelKey: 'maintenanceWindows.modes.read_only',
    descriptionKey: 'maintenanceWindows.modeDescriptions.read_only',
  },
  {
    value: 'full',
    labelKey: 'maintenanceWindows.modes.full',
    descriptionKey: 'maintenanceWindows.modeDescriptions.full',
  },
];

const localizedTextSchema = z.object({
  pt: z.string().min(1, 'Texto em português é obrigatório'),
  en: z.string().optional(),
  es: z.string().optional(),
});

const formSchema = z
  .object({
    mode: z.enum(['banner', 'read_only', 'full']),
    startsAt: z.string().min(1, 'Data de início é obrigatória'),
    hasEndDate: z.boolean(),
    endsAt: z.string().optional(),
    title: localizedTextSchema,
    message: localizedTextSchema,
    active: z.boolean(),
  })
  .refine((data) => !data.hasEndDate || !!data.endsAt, {
    message: 'Informe a data de término ou desmarque a previsão de retorno',
    path: ['endsAt'],
  })
  .refine(
    (data) =>
      !data.hasEndDate ||
      !data.endsAt ||
      new Date(data.endsAt) > new Date(data.startsAt),
    {
      message: 'A data de término deve ser posterior à data de início',
      path: ['endsAt'],
    },
  );

type FormData = z.infer<typeof formSchema>;

function toFormDefaults(window?: MaintenanceWindow | null): FormData {
  return {
    mode: window?.mode ?? 'banner',
    startsAt: isoToDatetimeLocalValue(window?.startsAt) || '',
    hasEndDate: window ? window.endsAt != null : true,
    endsAt: isoToDatetimeLocalValue(window?.endsAt),
    title: {
      pt: window?.title.pt ?? '',
      en: window?.title.en ?? '',
      es: window?.title.es ?? '',
    },
    message: {
      pt: window?.message.pt ?? '',
      en: window?.message.en ?? '',
      es: window?.message.es ?? '',
    },
    active: window?.active ?? true,
  };
}

/** Remove chaves de locale vazias para não gravar strings em branco no JSONB. */
function cleanLocalizedText(value: FormData['title']): {
  pt: string;
  en?: string;
  es?: string;
} {
  const cleaned: { pt: string; en?: string; es?: string } = { pt: value.pt };
  if (value.en?.trim()) cleaned.en = value.en.trim();
  if (value.es?.trim()) cleaned.es = value.es.trim();
  return cleaned;
}

function formDataToDto(data: FormData): CreateMaintenanceWindowDto {
  return {
    mode: data.mode,
    startsAt: datetimeLocalValueToIso(data.startsAt) ?? data.startsAt,
    endsAt: data.hasEndDate ? datetimeLocalValueToIso(data.endsAt ?? '') : null,
    title: cleanLocalizedText(data.title),
    message: cleanLocalizedText(data.message),
    active: data.active,
  };
}

interface MaintenanceWindowFormProps {
  initialValues?: MaintenanceWindow | null;
  onSubmit: (dto: CreateMaintenanceWindowDto) => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}

export default function MaintenanceWindowForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: MaintenanceWindowFormProps) {
  const { t } = useTranslation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormDefaults(initialValues),
  });

  const hasEndDate = watch('hasEndDate');
  const mode = watch('mode');

  const submit = (data: FormData) => onSubmit(formDataToDto(data));

  return (
    <Box component="form" onSubmit={handleSubmit(submit)}>
      <Stack spacing={3}>
        <Controller
          name="mode"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label={t('maintenanceWindows.mode')}
              fullWidth
              required
              error={!!errors.mode}
              helperText={
                errors.mode?.message ??
                t(MODE_OPTIONS.find((o) => o.value === mode)?.descriptionKey ?? '')
              }
            >
              {MODE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <TextField
          {...register('startsAt')}
          type="datetime-local"
          label={t('maintenanceWindows.startsAt')}
          fullWidth
          required
          InputLabelProps={{ shrink: true }}
          error={!!errors.startsAt}
          helperText={errors.startsAt?.message}
        />

        <Box>
          <FormControlLabel
            control={
              <Controller
                name="hasEndDate"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            }
            label={t('maintenanceWindows.hasEndDate')}
          />
          {!hasEndDate && (
            <Typography variant="caption" color="text.secondary" display="block">
              {t('maintenanceWindows.noEndDateHint')}
            </Typography>
          )}
          {hasEndDate && (
            <TextField
              {...register('endsAt')}
              type="datetime-local"
              label={t('maintenanceWindows.endsAt')}
              fullWidth
              sx={{ mt: 2 }}
              InputLabelProps={{ shrink: true }}
              error={!!errors.endsAt}
              helperText={errors.endsAt?.message}
            />
          )}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            {t('maintenanceWindows.title')}
          </Typography>
          <Stack spacing={2}>
            <TextField
              {...register('title.pt')}
              label={t('maintenanceWindows.localePt')}
              fullWidth
              required
              error={!!errors.title?.pt}
              helperText={errors.title?.pt?.message}
            />
            <TextField
              {...register('title.en')}
              label={t('maintenanceWindows.localeEn')}
              fullWidth
            />
            <TextField
              {...register('title.es')}
              label={t('maintenanceWindows.localeEs')}
              fullWidth
            />
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            {t('maintenanceWindows.message')}
          </Typography>
          <Stack spacing={2}>
            <TextField
              {...register('message.pt')}
              label={t('maintenanceWindows.localePt')}
              fullWidth
              required
              multiline
              minRows={2}
              error={!!errors.message?.pt}
              helperText={errors.message?.pt?.message}
            />
            <TextField
              {...register('message.en')}
              label={t('maintenanceWindows.localeEn')}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              {...register('message.es')}
              label={t('maintenanceWindows.localeEs')}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </Box>

        <Divider />

        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label={t('maintenanceWindows.active')}
            />
          )}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : submitLabel}
          </Button>
          <Button variant="outlined" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
