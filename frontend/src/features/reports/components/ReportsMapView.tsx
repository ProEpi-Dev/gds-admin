import { useMemo, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { ReportPoint } from '../../../types/report.types';

// Fix para ícone do marcador no Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Criar ícones customizados para POSITIVE e NEGATIVE
// Usando ícones coloridos do repositório leaflet-color-markers
const positiveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const negativeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Componente para ajustar o zoom automaticamente para caber todos os pontos
function FitBoundsComponent({ points }: { points: ReportPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(
        points.map((point) => [point.latitude, point.longitude])
      );
      
      // Ajustar o mapa para caber todos os pontos com padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, points]);

  return null;
}

// Componente para gerenciar os clusters
function MarkerClusterGroupComponent({ points }: { points: ReportPoint[] }) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!clusterGroupRef.current) {
      // Criar grupo de clusters com configuração customizada
      clusterGroupRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const childMarkers = cluster.getAllChildMarkers();
          
          // Contar positivos e negativos no cluster
          let positiveCount = 0;
          let negativeCount = 0;
          
          childMarkers.forEach((marker: L.Marker) => {
            const point = (marker as any).pointData as ReportPoint;
            if (point?.reportType === 'POSITIVE') {
              positiveCount++;
            } else if (point?.reportType === 'NEGATIVE') {
              negativeCount++;
            }
          });

          // Determinar cor do cluster baseado na maioria
          let color = '#51cf66'; // Verde padrão
          
          // Se há mais negativos, usar vermelho; se mais positivos, usar verde; se igual, usar amarelo
          if (negativeCount > positiveCount) {
            color = '#ff6b6b'; // Vermelho
          } else if (positiveCount > negativeCount) {
            color = '#51cf66'; // Verde
          } else if (positiveCount === negativeCount && positiveCount > 0) {
            color = '#ffd43b'; // Amarelo (misturado)
          }

          // Tamanho dinâmico baseado na quantidade
          let size = 40;
          let fontSize = 14;
          
          if (count > 100) {
            size = 50;
            fontSize = 16;
          } else if (count > 50) {
            size = 45;
            fontSize = 15;
          } else if (count > 20) {
            size = 42;
            fontSize = 14;
          }

          return L.divIcon({
            html: `<div style="background-color: ${color}; border-radius: 50%; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${fontSize}px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${count}</div>`,
            className: 'marker-cluster-custom',
            iconSize: L.point(size, size),
          });
        },
      });

      map.addLayer(clusterGroupRef.current);
    }

    // Limpar marcadores anteriores
    clusterGroupRef.current.clearLayers();

    // Adicionar novos marcadores
    points.forEach((point) => {
      const marker = L.marker([point.latitude, point.longitude], {
        icon: point.reportType === 'POSITIVE' ? positiveIcon : negativeIcon,
      });

      // Adicionar popup
      const popupContent = `
        <div>
          <strong>${point.reportType === 'POSITIVE' ? 'Positivo' : 'Negativo'}</strong><br/>
          <small>Lat: ${point.latitude.toFixed(6)}</small><br/>
          <small>Lng: ${point.longitude.toFixed(6)}</small>
        </div>
      `;
      marker.bindPopup(popupContent);

      // Armazenar dados do ponto no marcador para uso no cluster
      (marker as any).pointData = point;

      clusterGroupRef.current!.addLayer(marker);
    });

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

interface ReportsMapViewProps {
  points: ReportPoint[];
  height?: number;
}

export default function ReportsMapView({ points, height = 600 }: ReportsMapViewProps) {
  // Calcular o centro do mapa baseado nos pontos
  const mapCenter = useMemo(() => {
    if (points.length === 0) {
      return [-23.5505, -46.6333] as [number, number]; // São Paulo como padrão
    }

    const sumLat = points.reduce((acc, point) => acc + point.latitude, 0);
    const sumLng = points.reduce((acc, point) => acc + point.longitude, 0);
    const avgLat = sumLat / points.length;
    const avgLng = sumLng / points.length;

    return [avgLat, avgLng] as [number, number];
  }, [points]);

  // Calcular o zoom baseado na distribuição dos pontos
  const mapZoom = useMemo(() => {
    if (points.length === 0) return 10;
    if (points.length === 1) return 15;

    // Calcular a distância entre os pontos mais distantes
    let maxDistance = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const latDiff = Math.abs(points[i].latitude - points[j].latitude);
        const lngDiff = Math.abs(points[i].longitude - points[j].longitude);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        if (distance > maxDistance) {
          maxDistance = distance;
        }
      }
    }

    // Ajustar zoom baseado na distância máxima
    if (maxDistance > 1) return 8;
    if (maxDistance > 0.5) return 10;
    if (maxDistance > 0.1) return 12;
    return 14;
  }, [points]);

  const positiveCount = points.filter((p) => p.reportType === 'POSITIVE').length;
  const negativeCount = points.filter((p) => p.reportType === 'NEGATIVE').length;

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Total de pontos: {points.length}
        </Typography>
        <Typography variant="body2" color="success.main">
          Positivos: {positiveCount}
        </Typography>
        <Typography variant="body2" color="error.main">
          Negativos: {negativeCount}
        </Typography>
      </Box>
      <Box sx={{ height, width: '100%', position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroupComponent points={points} />
          <FitBoundsComponent points={points} />
        </MapContainer>
      </Box>
    </Box>
  );
}

