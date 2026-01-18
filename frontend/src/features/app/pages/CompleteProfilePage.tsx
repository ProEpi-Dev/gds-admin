import { Box, Typography, TextField, Button, CircularProgress, Paper } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../../api/services/users.service';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectGender from '../../../components/common/SelectGender';
import SelectLocation from '../../../components/common/SelectLocation';
import UserLayout from '../../../components/layout/UserLayout';
import type { UpdateProfileDto } from '../../../types/user.types';

const profileSchema = z.object({
  genderId: z.number({ message: 'Gênero é obrigatório' }),
  locationId: z.number({ message: 'Localização é obrigatória' }),
  externalIdentifier: z.string().min(1, 'Identificador externo é obrigatório'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileDto) => {
      await usersService.updateProfile(data);
    },
    onSuccess: async () => {
      snackbar.showSuccess(t('profile.success'));
      
      // Invalida todos os caches relacionados ao usuário
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile-status'] }),
        queryClient.invalidateQueries({ queryKey: ['user-role'] }),
      ]);
      
      // Força o refetch dos dados antes de redirecionar
      const [, userRole] = await Promise.all([
        queryClient.fetchQuery({ 
          queryKey: ['profile-status'],
          queryFn: () => usersService.getProfileStatus()
        }),
        queryClient.fetchQuery({
          queryKey: ['user-role'],
          queryFn: () => usersService.getUserRole()
        })
      ]);
      
      // Redireciona baseado no papel do usuário (usando dados recém-carregados)
      if (userRole.isManager) {
        navigate('/dashboard');
      } else {
        navigate('/app/welcome');
      }
    },
    onError: (err: unknown) => {
      const errorMessage = getErrorMessage(err, 'Erro ao atualizar perfil');
      snackbar.showError(errorMessage);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <UserLayout>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {t('profile.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          {t('profile.subtitle')}
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ mb: 2 }}>
            <Controller
              name="genderId"
              control={control}
              render={({ field }) => (
                <SelectGender
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.genderId}
                  helperText={errors.genderId?.message}
                  required
                  label={t('profile.gender')}
                />
              )}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Controller
              name="locationId"
              control={control}
              render={({ field }) => (
                <SelectLocation
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.locationId}
                  helperText={errors.locationId?.message}
                  required
                  label={t('profile.location')}
                />
              )}
            />
          </Box>

          <TextField
            {...register('externalIdentifier')}
            label={t('profile.externalIdentifier')}
            fullWidth
            margin="normal"
            error={!!errors.externalIdentifier}
            helperText={errors.externalIdentifier?.message || t('profile.externalIdentifierHelper')}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? <CircularProgress size={24} /> : t('profile.submit')}
          </Button>
        </Box>
      </Paper>
    </UserLayout>
  );
}
