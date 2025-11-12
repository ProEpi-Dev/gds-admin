import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
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
import { useForm as useFormQuery, useUpdateForm } from '../hooks/useForms';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { UpdateFormDto } from '../../../types/form.types';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.enum(['signal', 'quiz']),
  reference: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function FormEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const formId = id ? parseInt(id, 10) : null;
  const { data: form, isLoading, error: queryError } = useFormQuery(formId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (form) {
      reset({
        title: form.title,
        type: form.type,
        reference: form.reference ?? undefined,
        description: form.description ?? undefined,
        active: form.active,
      });
    }
  }, [form, reset]);

  const updateMutation = useUpdateForm();

  const onSubmit = (data: FormData) => {
    if (!formId) return;

    setError(null);
    const formData: UpdateFormDto = {
      title: data.title,
      type: data.type,
      reference: data.reference ?? undefined,
      description: data.description ?? undefined,
      active: data.active,
    };

    updateMutation.mutate(
      { id: formId, data: formData },
      {
        onSuccess: () => {
          navigate(`/forms/${formId}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, 'Erro ao atualizar formulário'));
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !form) {
    return <ErrorAlert message="Erro ao carregar formulário" />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Editar Formulário
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              {...register('title')}
              label="Título"
              fullWidth
              required
              error={!!errors.title}
              helperText={errors.title?.message}
            />

            <FormControl fullWidth required error={!!errors.type}>
              <InputLabel>Tipo</InputLabel>
              <Select {...register('type')} label="Tipo" value={form.type}>
                <MenuItem value="signal">Sinal</MenuItem>
                <MenuItem value="quiz">Quiz</MenuItem>
              </Select>
              {errors.type && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.type.message}
                </Typography>
              )}
            </FormControl>

            <TextField
              {...register('reference')}
              label="Referência (opcional)"
              fullWidth
              error={!!errors.reference}
              helperText={errors.reference?.message}
            />

            <TextField
              {...register('description')}
              label="Descrição (opcional)"
              fullWidth
              multiline
              rows={3}
              error={!!errors.description}
              helperText={errors.description?.message}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : 'Salvar'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/forms/${formId}`)}>
                Cancelar
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

