import { Box, Typography, TextField, Button, CircularProgress, Paper, Chip, Divider } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usersService } from '../../../api/services/users.service';
import { useAuth } from '../../../contexts/AuthContext';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectGender from '../../../components/common/SelectGender';
import SelectLocation from '../../../components/common/SelectLocation';
import UserLayout from '../../../components/layout/UserLayout';
import type { UpdateProfileDto } from '../../../types/user.types';

const profileSchema = z.object({
  genderId: z.number().optional(),
  locationId: z.number().optional(),
  externalIdentifier: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function UserProfilePage() {
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const { t } = useTranslation();

  const { data: profileStatus, isLoading: statusLoading, refetch } = useQuery({
    queryKey: ['profile-status'],
    queryFn: () => usersService.getProfileStatus(),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      genderId: profileStatus?.profile.genderId ?? undefined,
      locationId: profileStatus?.profile.locationId ?? undefined,
      externalIdentifier: profileStatus?.profile.externalIdentifier || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileDto) => {
      await usersService.updateProfile(data);
    },
    onSuccess: () => {
      snackbar.showSuccess(t('profile.success'));
      refetch();
    },
    onError: (err: unknown) => {
      const errorMessage = getErrorMessage(err, 'Erro ao atualizar perfil');
      snackbar.showError(errorMessage);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (statusLoading) {
    return (
      <UserLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 700, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('profile.myProfile')}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Status do Perfil:{' '}
            <Chip
              label={profileStatus?.isComplete ? t('profile.profileComplete') : t('profile.profileIncomplete')}
              color={profileStatus?.isComplete ? 'success' : 'warning'}
              size="small"
            />
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Informações Básicas
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField
            label="Nome"
            value={user?.name || ''}
            fullWidth
            margin="normal"
            disabled
          />
          <TextField
            label="Email"
            value={user?.email || ''}
            fullWidth
            margin="normal"
            disabled
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          {t('profile.editProfile')}
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ mb: 2 }}>
            <Controller
              name="genderId"
              control={control}
              render={({ field }) => (
                <SelectGender
                  value={field.value || null}
                  onChange={field.onChange}
                  error={!!errors.genderId}
                  helperText={errors.genderId?.message}
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
                  value={field.value || null}
                  onChange={field.onChange}
                  error={!!errors.locationId}
                  helperText={errors.locationId?.message}
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
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? <CircularProgress size={24} /> : 'Atualizar Perfil'}
          </Button>
        </Box>
      </Paper>
    </UserLayout>
  );
}
