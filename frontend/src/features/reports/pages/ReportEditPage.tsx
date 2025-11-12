import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useReport, useUpdateReport } from '../hooks/useReports';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectParticipation from '../../../components/common/SelectParticipation';
import SelectFormVersion from '../../../components/common/SelectFormVersion';
import FormRenderer from '../../../components/form-renderer/FormRenderer';
import LocationPicker from '../../../components/common/LocationPicker';
import { formsService } from '../../../api/services/forms.service';
import type { UpdateReportDto } from '../../../types/report.types';

const formSchema = z.object({
  participationId: z.number().min(1, 'Participação é obrigatória').optional(),
  formVersionId: z.number().min(1, 'Versão do formulário é obrigatória').optional(),
  reportType: z.enum(['POSITIVE', 'NEGATIVE']).optional(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ReportEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [formResponse, setFormResponse] = useState<Record<string, any>>({});
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const reportId = id ? parseInt(id, 10) : null;
  const { data: report, isLoading, error: queryError } = useReport(reportId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const formVersionId = watch('formVersionId');

  // Buscar definição do formulário
  const { data: formsWithVersions } = useQuery({
    queryKey: ['forms-with-versions'],
    queryFn: () => formsService.findFormsWithLatestVersions(),
  });

  const selectedFormVersion = formsWithVersions?.find(
    (item) => item.version.id === formVersionId
  )?.version;

  useEffect(() => {
    if (report) {
      reset({
        participationId: report.participationId,
        formVersionId: report.formVersionId,
        reportType: report.reportType,
        active: report.active,
      });
      setFormResponse(report.formResponse || {});
      if (report.occurrenceLocation) {
        setLocation({
          latitude: report.occurrenceLocation.latitude,
          longitude: report.occurrenceLocation.longitude,
        });
      }
    }
  }, [report, reset]);

  const updateMutation = useUpdateReport();

  const onSubmit = (data: FormData) => {
    if (!reportId) return;

    setError(null);

    // Validar se o formulário foi preenchido (se houver definição)
    if (selectedFormVersion?.definition) {
      if (Object.keys(formResponse).length === 0 || formResponse._isValid === false) {
        setError('Preencha todos os campos obrigatórios do formulário');
        return;
      }
    }

    // Remover _isValid do formResponse antes de enviar
    const { _isValid, ...cleanFormResponse } = formResponse;

    const updateData: UpdateReportDto = {};

    if (data.participationId !== undefined) {
      updateData.participationId = data.participationId;
    }

    if (data.formVersionId !== undefined) {
      updateData.formVersionId = data.formVersionId;
    }

    if (data.reportType !== undefined) {
      updateData.reportType = data.reportType;
    }

    if (Object.keys(cleanFormResponse).length > 0) {
      updateData.formResponse = cleanFormResponse;
    }

    if (location) {
      updateData.occurrenceLocation = location;
    } else if (report?.occurrenceLocation && !location) {
      // Se havia localização e foi removida
      updateData.occurrenceLocation = null;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    updateMutation.mutate(
      { id: reportId, data: updateData },
      {
        onSuccess: () => {
          navigate(`/reports/${reportId}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, t('reports.errorUpdatingReport')));
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !report) {
    return <ErrorAlert message={t('reports.errorLoadingReport')} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('common.edit')} {t('reports.title')}
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
              value={watch('participationId')}
              onChange={(id) => setValue('participationId', id || 0)}
              error={!!errors.participationId}
              helperText={errors.participationId?.message}
            />

            <SelectFormVersion
              value={watch('formVersionId')}
              onChange={(id) => setValue('formVersionId', id || 0)}
              error={!!errors.formVersionId}
              helperText={errors.formVersionId?.message}
            />

            <FormControl fullWidth error={!!errors.reportType}>
              <InputLabel>{t('reports.type')}</InputLabel>
              <Select {...register('reportType')} label={t('reports.type')} value={report.reportType}>
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
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/reports/${reportId}`)}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
