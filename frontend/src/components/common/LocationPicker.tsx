import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { MyLocation as MyLocationIcon, Map as MapIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix para ícone do marcador no Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  value?: { latitude: number; longitude: number } | null;
  onChange: (location: { latitude: number; longitude: number } | null) => void;
  label?: string;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  value,
  onChange,
  label = 'Localização',
}: LocationPickerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [latitude, setLatitude] = useState<string>(value?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState<string>(value?.longitude?.toString() || '');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    value ? [value.latitude, value.longitude] : [-23.5505, -46.6333] // São Paulo por padrão
  );

  useEffect(() => {
    if (value) {
      setLatitude(value.latitude.toString());
      setLongitude(value.longitude.toString());
      setMapCenter([value.latitude, value.longitude]);
    }
  }, [value]);

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada pelo seu navegador');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat.toString());
        setLongitude(lng.toString());
        setMapCenter([lat, lng]);
        onChange({ latitude: lat, longitude: lng });
        setIsGettingLocation(false);
      },
      (error) => {
        setLocationError('Erro ao obter localização: ' + error.message);
        setIsGettingLocation(false);
      },
    );
  };

  const handleManualInput = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      onChange(null);
      return;
    }

    if (lat < -90 || lat > 90) {
      setLocationError('Latitude deve estar entre -90 e 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setLocationError('Longitude deve estar entre -180 e 180');
      return;
    }

    setLocationError(null);
    setMapCenter([lat, lng]);
    onChange({ latitude: lat, longitude: lng });
  };

  const handleMapClick = (lat: number, lng: number) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    onChange({ latitude: lat, longitude: lng });
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab icon={<MyLocationIcon />} label="GPS" />
        <Tab icon={<MapIcon />} label="Mapa" />
      </Tabs>

      {activeTab === 0 && (
        <Stack spacing={2}>
          <Button
            variant="outlined"
            startIcon={isGettingLocation ? <CircularProgress size={20} /> : <MyLocationIcon />}
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation}
            fullWidth
          >
            {isGettingLocation ? 'Obtendo localização...' : 'Obter Localização Atual'}
          </Button>

          {locationError && (
            <Alert severity="error" onClose={() => setLocationError(null)}>
              {locationError}
            </Alert>
          )}

          <Stack direction="row" spacing={2}>
            <TextField
              label="Latitude"
              type="number"
              value={latitude}
              onChange={(e) => {
                setLatitude(e.target.value);
                handleManualInput();
              }}
              onBlur={handleManualInput}
              fullWidth
              inputProps={{ step: 'any', min: -90, max: 90 }}
            />
            <TextField
              label="Longitude"
              type="number"
              value={longitude}
              onChange={(e) => {
                setLongitude(e.target.value);
                handleManualInput();
              }}
              onBlur={handleManualInput}
              fullWidth
              inputProps={{ step: 'any', min: -180, max: 180 }}
            />
          </Stack>

          {value && (
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                Localização selecionada:
              </Typography>
              <Typography variant="body2">
                Lat: {value.latitude.toFixed(6)}, Lng: {value.longitude.toFixed(6)}
              </Typography>
            </Paper>
          )}
        </Stack>
      )}

      {activeTab === 1 && (
        <Box>
          <Paper sx={{ height: 400, overflow: 'hidden', mb: 2 }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {value && (
                <Marker position={[value.latitude, value.longitude]} />
              )}
            </MapContainer>
          </Paper>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Latitude"
              type="number"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              onBlur={handleManualInput}
              fullWidth
              inputProps={{ step: 'any', min: -90, max: 90 }}
            />
            <TextField
              label="Longitude"
              type="number"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              onBlur={handleManualInput}
              fullWidth
              inputProps={{ step: 'any', min: -180, max: 180 }}
            />
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Clique no mapa para selecionar uma localização
          </Typography>
        </Box>
      )}
    </Box>
  );
}

