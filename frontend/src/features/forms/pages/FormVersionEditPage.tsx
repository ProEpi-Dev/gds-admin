import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useFormVersion, useUpdateFormVersion } from '../hooks/useFormVersions';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import FormBuilder from '../../../components/form-builder/FormBuilder';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { UpdateFormVersionDto } from '../../../types/form-version.types';
import type { FormBuilderDefinition } from '../../../types/form-builder.types';

const formSchema = z.object({
  accessType: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function FormVersionEditPage() {
  const { formId: formIdParam, id: idParam } = useParams<{ formId: string; id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [definition, setDefinition] = useState<FormBuilderDefinition>({ fields: [] });

  const formId = formIdParam ? parseInt(formIdParam, 10) : null;
  const versionId = idParam ? parseInt(idParam, 10) : null;

  const { data: version, isLoading, error: queryError } = useFormVersion(formId, versionId);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accessType: undefined,
      active: false,
    },
  });

  useEffect(() => {
    if (version) {
      reset({
        accessType: version.accessType,
        active: version.active,
      });
      setDefinition(version.definition || { fields: [] });
    }
  }, [version, reset]);

  const updateMutation = useUpdateFormVersion();

  const onSubmit = (data: FormData) => {
    if (!formId || !versionId) return;

    if (definition.fields.length === 0) {
      setError('Adicione pelo menos um campo ao formulário');
      return;
    }

    setError(null);
    const formData: UpdateFormVersionDto = {
      accessType: data.accessType,
      definition: definition,
      active: data.active,
    };

    updateMutation.mutate(
      { formId, id: versionId, data: formData },
      {
        onSuccess: () => {
          navigate(`/forms/${formId}/versions/${versionId}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, 'Erro ao atualizar versão'));
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !version) {
    return <ErrorAlert message="Erro ao carregar versão do formulário" />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Editar Versão {version.versionNumber}
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={3} sx={{ mt: 3 }}>
          <FormControl error={!!errors.accessType} sx={{ maxWidth: 300 }}>
            <InputLabel id="access-type-label">Tipo de Acesso</InputLabel>
            <Controller
              name="accessType"
              control={control}
              render={({ field }) => (
                <Select
                  labelId="access-type-label"
                  label="Tipo de Acesso"
                  value={field.value || version?.accessType || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? undefined : value);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                >
                  <MenuItem value="PUBLIC">Público</MenuItem>
                  <MenuItem value="PRIVATE">Privado</MenuItem>
                </Select>
              )}
            />
            {errors.accessType && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                {errors.accessType.message}
              </Typography>
            )}
          </FormControl>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Definição do Formulário
            </Typography>
            <FormBuilder definition={definition} onChange={setDefinition} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <CircularProgress size={24} /> : 'Salvar'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/forms/${formId}/versions/${versionId}`)}>
              Cancelar
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

