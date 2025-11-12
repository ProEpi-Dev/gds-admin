import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useCreateContextManager } from '../hooks/useContextManagers';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectUser from '../../../components/common/SelectUser';
import type { CreateContextManagerDto } from '../../../types/context-manager.types';

const formSchema = z.object({
  userId: z.number().min(1, 'Usuário é obrigatório'),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ContextManagerCreateProps {
  contextId: number | null;
  onSuccess?: () => void;
}

export default function ContextManagerCreate({ contextId, onSuccess }: ContextManagerCreateProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const {
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      active: true,
    },
  });

  const userId = watch('userId');
  const active = watch('active');

  const createMutation = useCreateContextManager();

  const onSubmit = (data: FormData) => {
    if (!contextId) return;

    setError(null);
    const managerData: CreateContextManagerDto = {
      userId: data.userId,
      active: data.active,
    };

    createMutation.mutate(
      { contextId, data: managerData },
      {
        onSuccess: () => {
          if (onSuccess) {
            onSuccess();
          }
          // Reset form
          setValue('userId', undefined as any, { shouldValidate: false });
          setValue('active', true);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, t('contextManagers.errorCreating')));
        },
      },
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('contextManagers.newManager')}
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          <SelectUser
            value={userId || null}
            onChange={(id) => setValue('userId', id || undefined as any)}
            label={t('contextManagers.user')}
            required
            error={!!errors.userId}
            helperText={errors.userId?.message}
            activeOnly={true}
          />

          <FormControlLabel
            control={
              <Switch
                checked={active ?? true}
                onChange={(e) => setValue('active', e.target.checked)}
              />
            }
            label={t('contextManagers.status')}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || !contextId}
            >
              {createMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}

