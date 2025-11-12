import { useState } from 'react';
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
  Stack,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import FormBuilder from '../../../components/form-builder/FormBuilder';
import { useCreateFormVersion } from '../hooks/useFormVersions';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { CreateFormVersionDto } from '../../../types/form-version.types';
import type { FormBuilderDefinition } from '../../../types/form-builder.types';

const formSchema = z.object({
  accessType: z.enum(['PUBLIC', 'PRIVATE']),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FormVersionCreateProps {
  formId: number | null;
}

export default function FormVersionCreate({ formId }: FormVersionCreateProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [definition, setDefinition] = useState<FormBuilderDefinition>({
    fields: [],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accessType: 'PUBLIC',
      active: true,
    },
  });

  const createMutation = useCreateFormVersion();

  const onSubmit = (data: FormData) => {
    if (!formId) return;

    if (definition.fields.length === 0) {
      setError('Adicione pelo menos um campo ao formulário');
      return;
    }

    setError(null);
    const formData: CreateFormVersionDto = {
      accessType: data.accessType,
      definition: definition,
      active: data.active,
    };

    createMutation.mutate(
      { formId, data: formData },
      {
        onSuccess: (version) => {
          navigate(`/forms/${formId}/versions/${version.id}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, 'Erro ao criar versão'));
        },
      },
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Criar Nova Versão
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          <FormControl required error={!!errors.accessType} sx={{ maxWidth: 300 }}>
            <InputLabel>Tipo de Acesso</InputLabel>
            <Select {...register('accessType')} label="Tipo de Acesso" defaultValue="PUBLIC">
              <MenuItem value="PUBLIC">Público</MenuItem>
              <MenuItem value="PRIVATE">Privado</MenuItem>
            </Select>
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <CircularProgress size={24} /> : 'Criar Versão'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/forms/${formId}`)}>
              Cancelar
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

