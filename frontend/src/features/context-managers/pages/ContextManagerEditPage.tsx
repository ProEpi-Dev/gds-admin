import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useQuery } from '@tanstack/react-query';
import { useContextManager, useUpdateContextManager } from '../hooks/useContextManagers';
import { usersService } from '../../../api/services/users.service';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import type { UpdateContextManagerDto } from '../../../types/context-manager.types';

const formSchema = z.object({
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ContextManagerEditPage() {
  const { contextId: contextIdParam, id } = useParams<{ contextId: string; id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const contextId = contextIdParam ? parseInt(contextIdParam, 10) : null;
  const managerId = id ? parseInt(id, 10) : null;
  const { data: manager, isLoading, error: queryError } = useContextManager(contextId, managerId);

  // Buscar dados do usuário
  const { data: user } = useQuery({
    queryKey: ['users', manager?.userId],
    queryFn: () => (manager?.userId ? usersService.findOne(manager.userId) : null),
    enabled: !!manager?.userId,
  });

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const active = watch('active');

  useEffect(() => {
    if (manager) {
      reset({
        active: manager.active,
      });
    }
  }, [manager, reset]);

  const updateMutation = useUpdateContextManager();

  const onSubmit = (data: FormData) => {
    if (!contextId || !managerId) return;

    setError(null);

    const updateData: UpdateContextManagerDto = {
      active: data.active,
    };

    updateMutation.mutate(
      { contextId, id: managerId, data: updateData },
      {
        onSuccess: () => {
          navigate(`/contexts/${contextId}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, t('contextManagers.errorUpdating')));
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !manager) {
    return <ErrorAlert message={t('contextManagers.errorLoadingManager')} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('common.edit')} {t('contextManagers.title')}
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('contextManagers.user')}
              </Typography>
              {user ? (
                <Box>
                  <Typography variant="body1">{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body1">#{manager.userId}</Typography>
              )}
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? false}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('contextManagers.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/contexts/${contextId}`)}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

