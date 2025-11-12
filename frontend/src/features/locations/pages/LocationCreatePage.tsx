import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useCreateLocation } from '../hooks/useLocations';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useTranslation } from '../../../hooks/useTranslation';
import SelectLocation from '../../../components/common/SelectLocation';
import LocationMapEditor from '../../../components/common/LocationMapEditor';
import type { CreateLocationDto } from '../../../types/location.types';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  parentId: z.number().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  polygons: z.any().optional().nullable(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function LocationCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [polygons, setPolygons] = useState<any | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      active: true,
      parentId: null,
      latitude: null,
      longitude: null,
      polygons: null,
    },
  });

  const parentId = watch('parentId');
  const active = watch('active');

  const createMutation = useCreateLocation();

  // Sincronizar ponto do mapa com os campos do formulário
  useEffect(() => {
    if (point) {
      setValue('latitude', point.latitude);
      setValue('longitude', point.longitude);
    }
  }, [point, setValue]);

  // Sincronizar polígonos do mapa com o formulário
  useEffect(() => {
    setValue('polygons', polygons);
  }, [polygons, setValue]);

  const onSubmit = (data: FormData) => {
    setError(null);

    const locationData: CreateLocationDto = {
      name: data.name,
      parentId: data.parentId || undefined,
      latitude: point?.latitude || undefined,
      longitude: point?.longitude || undefined,
      polygons: polygons || undefined,
      active: data.active,
    };

    createMutation.mutate(locationData, {
      onSuccess: (location) => {
        navigate(`/locations/${location.id}`);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err, t('locations.errorCreatingLocation')));
      },
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('locations.newLocation')}
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
              required
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <SelectLocation
              value={parentId}
              onChange={(id) => setValue('parentId', id)}
              label={t('locations.parent')}
              activeOnly={false}
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
                  checked={active ?? true}
                  onChange={(e) => setValue('active', e.target.checked)}
                />
              }
              label={t('locations.status')}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/locations')}>
                {t('common.cancel')}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

