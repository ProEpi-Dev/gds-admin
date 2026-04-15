import { useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Paper, Chip, Divider, Alert, Autocomplete } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../../api/services/users.service';
import { participationProfileExtraService } from '../../../api/services/participation-profile-extra.service';
import { useAuth } from '../../../contexts/AuthContext';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectGender from '../../../components/common/SelectGender';
import UserLayout from '../../../components/layout/UserLayout';
import ProfileExtraFormSection from '../components/ProfileExtraFormSection';
import { resolveProfileExtraPayload } from '../utils/profileExtraPayload';
import type {
  UpdateProfileDto,
  ProfileFieldRequirements,
} from '../../../types/user.types';
import { locationsService } from '../../../api/services/locations.service';
import type { FormRendererHandle } from '../../../components/form-renderer/FormRenderer';
import { isLocationDescendantOfCountry } from '../../../utils/locationHierarchy';

const profileSchema = z.object({
  genderId: z.number().optional(),
  countryLocationId: z.number().optional(),
  locationId: z.number().optional(),
  externalIdentifier: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const DEFAULT_PROFILE_FIELD_REQUIREMENTS: ProfileFieldRequirements = {
  gender: true,
  country: false,
  location: true,
  externalIdentifier: true,
  phone: false,
};

export default function UserProfilePage() {
  const { user } = useAuth();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [extraValues, setExtraValues] = useState<Record<string, unknown>>({});
  const [extraError, setExtraError] = useState<string | null>(null);
  const profileExtraFormRef = useRef<FormRendererHandle>(null);

  const { data: profileStatus, isLoading: statusLoading, refetch } = useQuery({
    queryKey: ['profile-status'],
    queryFn: () => usersService.getProfileStatus(),
  });

  const { data: profileExtraMe } = useQuery({
    queryKey: ['participation-profile-extra-me'],
    queryFn: () => participationProfileExtraService.getMe(),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      genderId: profileStatus?.profile.genderId ?? undefined,
      countryLocationId: profileStatus?.profile.countryLocationId ?? undefined,
      locationId: profileStatus?.profile.locationId ?? undefined,
      externalIdentifier: profileStatus?.profile.externalIdentifier || '',
      phone: profileStatus?.profile.phone || '',
    },
  });

  const selectedCountryLocationId = watch('countryLocationId');
  const selectedLocationId = watch('locationId');

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['locations', 'countries', 'all-pages'],
    queryFn: () =>
      locationsService.findAllAllPages({
        active: true,
        orgLevel: 'COUNTRY',
      }),
  });

  const { data: allLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', 'all-active', 'all-pages'],
    queryFn: () =>
      locationsService.findAllAllPages({
        active: true,
      }),
  });

  useEffect(() => {
    if (!profileStatus?.profile) return;
    reset({
      genderId: profileStatus.profile.genderId ?? undefined,
      countryLocationId: profileStatus.profile.countryLocationId ?? undefined,
      locationId: profileStatus.profile.locationId ?? undefined,
      externalIdentifier: profileStatus.profile.externalIdentifier || '',
      phone: profileStatus.profile.phone || '',
    });
  }, [profileStatus, reset]);

  useEffect(() => {
    if (!selectedLocationId || !selectedCountryLocationId) {
      return;
    }

    const currentLocation = allLocations.find(
      (location) => location.id === selectedLocationId,
    );

    if (!currentLocation) {
      return;
    }

    const isChild = isLocationDescendantOfCountry(
      currentLocation,
      selectedCountryLocationId,
    );

    if (!isChild) {
      setValue('locationId', undefined);
    }
  }, [selectedCountryLocationId, selectedLocationId, allLocations, setValue]);

  const saveProfileExtraMutation = useMutation({
    mutationFn: async () => {
      const me = await queryClient.fetchQuery({
        queryKey: ['participation-profile-extra-me'],
        queryFn: () => participationProfileExtraService.getMe(),
      });
      const resolved = resolveProfileExtraPayload(me, extraValues);
      if ('error' in resolved || !me?.form) {
        throw new Error(t('profile.profileExtraInvalid'));
      }
      await participationProfileExtraService.saveMe({
        formVersionId: me.form.version.id,
        formResponse: resolved.ok,
      });
    },
    onSuccess: async () => {
      snackbar.showSuccess(t('profile.profileExtraSaved'));
      setExtraError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['participation-profile-extra-me'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-status'] }),
      ]);
    },
    onError: (err: unknown) => {
      snackbar.showError(getErrorMessage(err, t('profile.profileExtraInvalid')));
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

  if (statusLoading || !profileStatus) {
    return (
      <UserLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </UserLayout>
    );
  }

  const profileReq =
    profileStatus.profileFieldRequirements ?? DEFAULT_PROFILE_FIELD_REQUIREMENTS;

  const selectedCountry =
    countries.find((item) => item.id === selectedCountryLocationId) ?? null;

  const locationsByCountry =
    profileReq.country && selectedCountryLocationId
      ? allLocations.filter((location) =>
          isLocationDescendantOfCountry(location, selectedCountryLocationId),
        )
      : profileReq.country
        ? []
        : allLocations;

  return (
    <UserLayout>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 700, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('profile.myProfile')}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            component="div"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
          >
            Status do Perfil:{' '}
            <Chip
              label={profileStatus.isComplete ? t('profile.profileComplete') : t('profile.profileIncomplete')}
              color={profileStatus.isComplete ? 'success' : 'warning'}
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

          {profileReq.country ? (
            <Box sx={{ mb: 2 }}>
              <Controller
                name="countryLocationId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    value={
                      countries.find((country) => country.id === field.value) ??
                      null
                    }
                    onChange={(_, newValue) =>
                      field.onChange(newValue?.id ?? undefined)
                    }
                    options={countries}
                    getOptionLabel={(option) => option.name}
                    loading={countriesLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('profile.country')}
                        error={!!errors.countryLocationId}
                        helperText={errors.countryLocationId?.message}
                      />
                    )}
                  />
                )}
              />
            </Box>
          ) : null}

          <Box sx={{ mb: 2 }}>
            <Controller
              name="locationId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={
                    locationsByCountry.find(
                      (location) => location.id === field.value,
                    ) ?? null
                  }
                  onChange={(_, newValue) =>
                    field.onChange(newValue?.id ?? undefined)
                  }
                  options={locationsByCountry}
                  getOptionLabel={(option) => option.name}
                  loading={locationsLoading}
                  disabled={profileReq.country && !selectedCountry}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('profile.location')}
                      error={!!errors.locationId}
                      helperText={
                        errors.locationId?.message ??
                        (profileReq.country && !selectedCountry
                          ? t('profile.locationSelectCountryFirst')
                          : undefined)
                      }
                    />
                  )}
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

          <TextField
            {...register('phone')}
            label={t('profile.phone')}
            fullWidth
            margin="normal"
            error={!!errors.phone}
            helperText={errors.phone?.message}
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

        <ProfileExtraFormSection
          ref={profileExtraFormRef}
          onValuesChange={setExtraValues}
          participantCountryLocationId={
            watch('countryLocationId') ??
            profileStatus.profile.countryLocationId ??
            null
          }
        />

        {profileExtraMe?.form && (
          <Box sx={{ mt: 2 }}>
            {extraError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExtraError(null)}>
                {extraError}
              </Alert>
            )}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              disabled={saveProfileExtraMutation.isPending}
              onClick={() => {
                setExtraError(null);
                const resolved = resolveProfileExtraPayload(profileExtraMe, extraValues);
                if ('error' in resolved) {
                  if (resolved.error === 'invalid') {
                    profileExtraFormRef.current?.revealFieldErrors();
                  }
                  setExtraError(t('profile.profileExtraInvalid'));
                  return;
                }
                saveProfileExtraMutation.mutate();
              }}
            >
              {saveProfileExtraMutation.isPending ? (
                <CircularProgress size={24} />
              ) : (
                t('profile.profileExtraSave')
              )}
            </Button>
          </Box>
        )}
      </Paper>
    </UserLayout>
  );
}
