import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useCreateReport } from '../hooks/useReports';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectParticipation from '../../../components/common/SelectParticipation';
import SelectFormVersion from '../../../components/common/SelectFormVersion';
import FormRenderer from '../../../components/form-renderer/FormRenderer';
import LocationPicker from '../../../components/common/LocationPicker';
import { formsService } from '../../../api/services/forms.service';
import type { CreateReportDto } from '../../../types/report.types';

const formSchema = z.object({
  participationId: z.number().min(1, 'Participação é obrigatória'),
  formVersionId: z.number().min(1, 'Versão do formulário é obrigatória'),
  reportType: z.enum(['POSITIVE', 'NEGATIVE']),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ReportCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [formResponse, setFormResponse] = useState<Record<string, any>>({});
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportType: 'POSITIVE',
      active: true,
    },
  });

  const participationId = watch('participationId');
  const formVersionId = watch('formVersionId');

  // Buscar definição do formulário quando uma versão é selecionada
  const { data: formsWithVersions } = useQuery({
    queryKey: ['forms-with-versions'],
    queryFn: () => formsService.findFormsWithLatestVersions(),
  });

  const selectedFormVersion = formsWithVersions?.find(
    (item) => item.version.id === formVersionId
  )?.version;

  useEffect(() => {
    if (formVersionId) {
      // Limpar resposta quando mudar a versão
      setFormResponse({});
    }
  }, [formVersionId]);

  const createMutation = useCreateReport();

  const onSubmit = (data: FormData) => {
    setError(null);

    if (!selectedFormVersion) {
      setError('Selecione uma versão de formulário');
      return;
    }

    // Validar se o formulário foi preenchido
    if (Object.keys(formResponse).length === 0 || formResponse._isValid === false) {
      setError('Preencha todos os campos obrigatórios do formulário');
      return;
    }

    // Remover _isValid do formResponse antes de enviar
    const { _isValid, ...cleanFormResponse } = formResponse;

    const reportData: CreateReportDto = {
      participationId: data.participationId!,
      formVersionId: data.formVersionId!,
      reportType: data.reportType,
      formResponse: cleanFormResponse,
      occurrenceLocation: location || undefined,
      active: data.active,
    };

    createMutation.mutate(reportData, {
      onSuccess: (report) => {
        navigate(`/reports/${report.id}`);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err, t('reports.errorCreatingReport')));
      },
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('reports.newReport')}
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <SelectParticipation
              value={participationId}
              onChange={(id) => setValue('participationId', id || 0)}
              required
              error={!!errors.participationId}
              helperText={errors.participationId?.message}
            />

            <SelectFormVersion
              value={formVersionId}
              onChange={(id) => setValue('formVersionId', id || 0)}
              required
              error={!!errors.formVersionId}
              helperText={errors.formVersionId?.message}
            />

            <FormControl fullWidth required error={!!errors.reportType}>
              <InputLabel>{t('reports.type')}</InputLabel>
              <Select {...register('reportType')} label={t('reports.type')} defaultValue="POSITIVE">
                <MenuItem value="POSITIVE">{t('reports.positive')}</MenuItem>
                <MenuItem value="NEGATIVE">{t('reports.negative')}</MenuItem>
              </Select>
              {errors.reportType && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.reportType.message}
                </Typography>
              )}
            </FormControl>

            {selectedFormVersion?.definition && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Preencha o Formulário
                </Typography>
                <FormRenderer
                  definition={selectedFormVersion.definition}
                  initialValues={formResponse}
                  onChange={setFormResponse}
                />
              </Box>
            )}

            <LocationPicker
              value={location}
              onChange={setLocation}
              label="Localização da Ocorrência (opcional)"
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/reports')}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
