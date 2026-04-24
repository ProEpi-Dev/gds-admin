import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Alert,
  Autocomplete,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../../api/services/users.service';
import { participationProfileExtraService } from '../../../api/services/participation-profile-extra.service';
import { locationsService } from '../../../api/services/locations.service';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectGender from '../../../components/common/SelectGender';
import UserLayout from '../../../components/layout/UserLayout';
import ProfileExtraFormSection from '../components/ProfileExtraFormSection';
import type { FormRendererHandle } from '../../../components/form-renderer/FormRenderer';
import type {
  UpdateProfileDto,
  ProfileFieldRequirements,
  ProfileStatusResponse,
} from '../../../types/user.types';
import type { ParticipationProfileExtraMeResponse } from '../../../types/participation-profile-extra.types';
import type { Location } from '../../../types/location.types';
import { resolveProfileExtraPayload } from '../utils/profileExtraPayload';
import { isLocationDescendantOfCountry } from '../../../utils/locationHierarchy';

const DEFAULT_PROFILE_REQUIREMENTS: ProfileFieldRequirements = {
  gender: true,
  country: false,
  location: true,
  externalIdentifier: true,
  phone: false,
};

type CompleteProfileFormProps = {
  req: ProfileFieldRequirements;
  profileStatus: ProfileStatusResponse;
  profileExtraMe: ParticipationProfileExtraMeResponse | null | undefined;
};

function CompleteProfileForm({
  req,
  profileStatus,
  profileExtraMe,
}: CompleteProfileFormProps) {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [extraValues, setExtraValues] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const profileExtraFormRef = useRef<FormRendererHandle>(null);

  const numRequired = (msg: string) =>
    z.number({
      error: () => ({ message: msg }),
    });

  const profileSchema = useMemo(() => {
    return z.object({
      genderId: req.gender
        ? numRequired(t('profile.errors.genderRequired'))
        : z.number().optional(),
      countryLocationId: req.country
        ? numRequired(t('profile.errors.countryRequired'))
        : z.number().optional(),
      locationId: req.location
        ? numRequired(t('profile.errors.locationRequired'))
        : z.number().optional(),
      externalIdentifier: req.externalIdentifier
        ? z.string().min(1, t('profile.errors.externalIdentifierRequired'))
        : z.string().optional(),
      phone: req.phone
        ? z.string().trim().min(4, t('profile.errors.phoneRequired'))
        : z.string().optional(),
    });
  }, [
    t,
    req.gender,
    req.country,
    req.location,
    req.externalIdentifier,
    req.phone,
  ]);

  type ProfileFormData = z.infer<typeof profileSchema>;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    resetField,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
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

  const locationsById = useMemo(
    () => new Map(allLocations.map((l) => [l.id, l])),
    [allLocations],
  );

  useEffect(() => {
    reset({
      genderId: profileStatus.profile.genderId ?? undefined,
      countryLocationId: profileStatus.profile.countryLocationId ?? undefined,
      locationId: profileStatus.profile.locationId ?? undefined,
      externalIdentifier: profileStatus.profile.externalIdentifier ?? '',
      phone: profileStatus.profile.phone?.trim() ?? '',
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
      locationsById,
    );

    if (!isChild) {
      resetField('locationId');
    }
  }, [
    selectedCountryLocationId,
    selectedLocationId,
    allLocations,
    locationsById,
    resetField,
  ]);

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
    const payload: UpdateProfileDto = {};
    if (data.genderId != null) payload.genderId = data.genderId;
    if (data.countryLocationId != null) {
      payload.countryLocationId = data.countryLocationId;
    }
    if (data.locationId != null) payload.locationId = data.locationId;
    if (data.externalIdentifier !== undefined) {
      payload.externalIdentifier = data.externalIdentifier.trim();
    }
    if (data.phone !== undefined) {
      payload.phone = data.phone.trim();
    }
    updateProfileMutation.mutate({
      profile: payload,
      extraMe: profileExtraMe,
      extras: extraValues,
    });
  };

  const selectedCountry =
    countries.find((item) => item.id === selectedCountryLocationId) ?? null;

  const locationsByCountry = req.country
    ? selectedCountryLocationId
      ? allLocations.filter((location) =>
          isLocationDescendantOfCountry(
            location,
            selectedCountryLocationId,
            locationsById,
          ),
        )
      : []
    : allLocations;

  return (
    <>
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
                required={req.gender}
                label={t('profile.sex')}
              />
            )}
          />
        </Box>

        {req.country ? (
          <Box sx={{ mb: 2 }}>
            <Controller
              name="countryLocationId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  value={
                    countries.find((country) => country.id === field.value) ?? null
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
                      required
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
                getOptionLabel={(option: Location) => option.name}
                loading={locationsLoading}
                disabled={req.country && !selectedCountry}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('profile.location')}
                    required={req.location}
                    error={!!errors.locationId}
                    helperText={
                      errors.locationId?.message ??
                      (req.country && !selectedCountry
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
          helperText={
            errors.externalIdentifier?.message ||
            t('profile.externalIdentifierHelper')
          }
          required={req.externalIdentifier}
        />

        <TextField
          {...register('phone')}
          label={t('profile.phone')}
          fullWidth
          margin="normal"
          error={!!errors.phone}
          helperText={errors.phone?.message}
          required={req.phone}
        />

        <ProfileExtraFormSection
          ref={profileExtraFormRef}
          onValuesChange={setExtraValues}
          participantCountryLocationId={
            watch('countryLocationId') ??
            profileStatus.profile.countryLocationId ??
            null
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
    </>
  );
}

export default function CompleteProfilePage() {
  const { data: profileStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['profile-status'],
    queryFn: () => usersService.getProfileStatus(),
  });

  const { data: profileExtraMe, isLoading: extraMeLoading } = useQuery({
    queryKey: ['participation-profile-extra-me'],
    queryFn: () => participationProfileExtraService.getMe(),
  });

  const req =
    profileStatus?.profileFieldRequirements ?? DEFAULT_PROFILE_REQUIREMENTS;

  const formKey = `${req.gender}-${req.country}-${req.location}-${req.externalIdentifier}-${req.phone}`;

  if (statusLoading || extraMeLoading || !profileStatus) {
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
        <CompleteProfileForm
          key={formKey}
          req={req}
          profileStatus={profileStatus}
          profileExtraMe={profileExtraMe}
        />
      </Paper>
    </UserLayout>
  );
}
