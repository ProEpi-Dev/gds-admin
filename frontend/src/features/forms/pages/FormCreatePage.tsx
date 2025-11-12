import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useCreateForm } from '../hooks/useForms';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { CreateFormDto } from '../../../types/form.types';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.enum(['signal', 'quiz']),
  reference: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function FormCreatePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'signal',
      active: true,
    },
  });

  const createMutation = useCreateForm();

  const onSubmit = (data: FormData) => {
    setError(null);
    const formData: CreateFormDto = {
      title: data.title,
      type: data.type,
      reference: data.reference,
      description: data.description,
      active: data.active,
    };

    createMutation.mutate(formData, {
      onSuccess: (form) => {
        navigate(`/forms/${form.id}`);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err, 'Erro ao criar formulário'));
      },
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Criar Formulário
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
              <Select {...register('type')} label="Tipo" defaultValue="signal">
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
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <CircularProgress size={24} /> : 'Criar'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/forms')}>
                Cancelar
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

