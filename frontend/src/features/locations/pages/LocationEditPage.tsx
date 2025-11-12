import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useLocation, useUpdateLocation } from '../hooks/useLocations';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectLocation from '../../../components/common/SelectLocation';
import LocationMapEditor from '../../../components/common/LocationMapEditor';
import type { UpdateLocationDto } from '../../../types/location.types';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  parentId: z.number().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  polygons: z.any().optional().nullable(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function LocationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [polygons, setPolygons] = useState<any | null>(null);

  const locationId = id ? parseInt(id, 10) : null;
  const { data: location, isLoading, error: queryError } = useLocation(locationId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const parentId = watch('parentId');
  const active = watch('active');

  useEffect(() => {
    if (location) {
      reset({
        name: location.name,
        parentId: location.parentId,
        latitude: location.latitude,
        longitude: location.longitude,
        polygons: location.polygons,
        active: location.active,
      });
      if (location.latitude !== null && location.longitude !== null) {
        setPoint({ latitude: location.latitude, longitude: location.longitude });
      } else {
        setPoint(null);
      }
      setPolygons(location.polygons);
    }
  }, [location, reset]);

  const updateMutation = useUpdateLocation();

  // Sincronizar ponto do mapa com os campos do formulário
  useEffect(() => {
    if (point) {
      setValue('latitude', point.latitude);
      setValue('longitude', point.longitude);
    } else {
      setValue('latitude', null);
      setValue('longitude', null);
    }
  }, [point, setValue]);

  // Sincronizar polígonos do mapa com o formulário
  useEffect(() => {
    setValue('polygons', polygons);
  }, [polygons, setValue]);

  const onSubmit = (data: FormData) => {
    if (!locationId) return;

    setError(null);

    const updateData: UpdateLocationDto = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.parentId !== undefined) {
      updateData.parentId = data.parentId || undefined;
    }

    if (point) {
      updateData.latitude = point.latitude;
      updateData.longitude = point.longitude;
    } else {
      updateData.latitude = undefined;
      updateData.longitude = undefined;
    }

    if (polygons !== undefined) {
      updateData.polygons = polygons || undefined;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    updateMutation.mutate(
      { id: locationId, data: updateData },
      {
        onSuccess: () => {
          navigate(`/locations/${locationId}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, t('locations.errorUpdatingLocation')));
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !location) {
    return <ErrorAlert message={t('locations.errorLoadingLocation')} />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('common.edit')} {t('locations.title')}
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
              {...register('name')}
              label={t('locations.name')}
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <SelectLocation
              value={parentId}
              onChange={(id) => setValue('parentId', id)}
              label={t('locations.parent')}
              activeOnly={false}
              excludeId={locationId || undefined}
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('locations.mapEditor')}
              </Typography>
              <LocationMapEditor
                point={point}
                polygons={polygons}
                onPointChange={setPoint}
                onPolygonsChange={setPolygons}
                height={400}
              />
              {point && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {t('locations.pointSelected')}: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                </Typography>
              )}
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={active ?? false}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('locations.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/locations/${locationId}`)}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

