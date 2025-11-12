import { Box, Typography } from '@mui/material';
import { MapContainer, TileLayer, Marker, Polygon } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '../../types/location.types';

// Fix para ícone do marcador no Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationMapViewerProps {
  location: Location;
  height?: number;
}

export default function LocationMapViewer({ location, height = 400 }: LocationMapViewerProps) {
  // Calcular centro do mapa
  const mapCenter: [number, number] =
    location.latitude !== null && location.longitude !== null
      ? [location.latitude, location.longitude]
      : [-23.5505, -46.6333]; // São Paulo por padrão

  // Renderizar polígonos
  const renderPolygons = () => {
    if (!location.polygons) return null;

    try {
      if (location.polygons.type === 'Polygon' && location.polygons.coordinates) {
        const positions = location.polygons.coordinates[0].map((coord: number[]) => [
          coord[1],
          coord[0],
        ] as [number, number]);
        return <Polygon positions={positions} pathOptions={{ color: 'blue' }} />;
      } else if (location.polygons.type === 'MultiPolygon' && location.polygons.coordinates) {
        return location.polygons.coordinates.map((polygonCoords: number[][][], idx: number) => {
          const positions = polygonCoords[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
          return (
            <Polygon key={idx} positions={positions} pathOptions={{ color: 'blue' }} />
          );
        });
      }
    } catch (err) {
      console.error('Erro ao renderizar polígonos:', err);
    }
    return null;
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {location.name}
      </Typography>
      <Box sx={{ height, width: '100%', position: 'relative' }}>
        <MapContainer
          center={mapCenter}
          zoom={location.latitude !== null && location.longitude !== null ? 15 : 10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {location.latitude !== null && location.longitude !== null && (
            <Marker position={[location.latitude, location.longitude]} />
          )}
          {renderPolygons()}
        </MapContainer>
      </Box>
    </Box>
  );
}


