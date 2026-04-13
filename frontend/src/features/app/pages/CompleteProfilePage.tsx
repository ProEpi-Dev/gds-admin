import { useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Paper, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../../api/services/users.service';
import { participationProfileExtraService } from '../../../api/services/participation-profile-extra.service';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectGender from '../../../components/common/SelectGender';
import SelectLocation from '../../../components/common/SelectLocation';
import UserLayout from '../../../components/layout/UserLayout';
import ProfileExtraFormSection from '../components/ProfileExtraFormSection';
import type { FormRendererHandle } from '../../../components/form-renderer/FormRenderer';
import type { UpdateProfileDto } from '../../../types/user.types';
import type { ParticipationProfileExtraMeResponse } from '../../../types/participation-profile-extra.types';
import { resolveProfileExtraPayload } from '../utils/profileExtraPayload';

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
  const [extraValues, setExtraValues] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const profileExtraFormRef = useRef<FormRendererHandle>(null);

  const { data: profileStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['profile-status'],
    queryFn: () => usersService.getProfileStatus(),
  });

  const { data: profileExtraMe, isLoading: extraMeLoading } = useQuery({
    queryKey: ['participation-profile-extra-me'],
    queryFn: () => participationProfileExtraService.getMe(),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!profileStatus?.profile) return;
    reset({
      genderId: profileStatus.profile.genderId ?? undefined,
      locationId: profileStatus.profile.locationId ?? undefined,
      externalIdentifier: profileStatus.profile.externalIdentifier ?? '',
    });
  }, [profileStatus, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: async (vars: {
      profile: UpdateProfileDto;
      extraMe: ParticipationProfileExtraMeResponse | null | undefined;
      extras: Record<string, unknown>;
    }) => {
      await usersService.updateProfile(vars.profile);
      if (!vars.extraMe?.form) {
        return;
      }
      const resolved = resolveProfileExtraPayload(vars.extraMe, vars.extras);
      if ('error' in resolved) {
        throw new Error(t('profile.profileExtraInvalid'));
      }
      await participationProfileExtraService.saveMe({
        formVersionId: vars.extraMe.form.version.id,
        formResponse: resolved.ok,
      });
    },
    onSuccess: async () => {
      snackbar.showSuccess(t('profile.success'));
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile-status'] }),
        queryClient.invalidateQueries({ queryKey: ['user-role'] }),
        queryClient.invalidateQueries({ queryKey: ['participation-profile-extra-me'] }),
      ]);
      const [, userRole] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: ['profile-status'],
          queryFn: () => usersService.getProfileStatus(),
        }),
        queryClient.fetchQuery({
          queryKey: ['user-role'],
          queryFn: () => usersService.getUserRole(),
        }),
      ]);
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
    setFormError(null);
    const resolved = resolveProfileExtraPayload(profileExtraMe, extraValues);
    if ('error' in resolved) {
      if (resolved.error === 'invalid') {
        profileExtraFormRef.current?.revealFieldErrors();
      }
      setFormError(t('profile.profileExtraInvalid'));
      return;
    }
    updateProfileMutation.mutate({
      profile: data,
      extraMe: profileExtraMe,
      extras: extraValues,
    });
  };

  if (statusLoading || extraMeLoading) {
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
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {t('profile.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          {t('profile.subtitle')}
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

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

          <ProfileExtraFormSection
            ref={profileExtraFormRef}
            onValuesChange={setExtraValues}
            participantCountryLocationId={
              profileStatus?.profile.countryLocationId ?? null
            }
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
