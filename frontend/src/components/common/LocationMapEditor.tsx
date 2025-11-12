import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';

// Importar leaflet-draw - precisa ser importado após o leaflet
// @ts-ignore - leaflet-draw não tem tipos completos
import 'leaflet-draw';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

// Fix para ícone do marcador no Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationMapEditorProps {
  point?: { latitude: number; longitude: number } | null;
  polygons?: any | null;
  onPointChange?: (point: { latitude: number; longitude: number } | null) => void;
  onPolygonsChange?: (polygons: any | null) => void;
  readOnly?: boolean;
  height?: number;
}

function DrawControl({
  onDrawCreated,
  onDrawEdited,
  onDrawDeleted,
  point,
  polygons,
  readOnly,
}: {
  onDrawCreated: (e: L.DrawEvents.Created) => void;
  onDrawEdited: (e: L.DrawEvents.Edited) => void;
  onDrawDeleted: (e: L.DrawEvents.Deleted) => void;
  point?: { latitude: number; longitude: number } | null;
  polygons?: any | null;
  readOnly: boolean;
}) {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const markersRef = useRef<L.Marker[]>([]);
  const polygonsRef = useRef<L.Polygon[]>([]);

  // Limpar marcadores e polígonos anteriores antes de adicionar novos
  const clearPreviousItems = useCallback(() => {
    markersRef.current.forEach((m) => {
      if (drawnItemsRef.current.hasLayer(m)) {
        drawnItemsRef.current.removeLayer(m);
      }
    });
    polygonsRef.current.forEach((p) => {
      if (drawnItemsRef.current.hasLayer(p)) {
        drawnItemsRef.current.removeLayer(p);
      }
    });
    markersRef.current = [];
    polygonsRef.current = [];
  }, []);

  useEffect(() => {
    if (readOnly) return;

    // Limpar itens anteriores
    clearPreviousItems();
    drawnItemsRef.current.clearLayers();

    // Adicionar feature group ao mapa
    drawnItemsRef.current.addTo(map);

    // Adicionar ponto existente ao mapa
    if (point) {
      const marker = L.marker([point.latitude, point.longitude]);
      drawnItemsRef.current.addLayer(marker);
      markersRef.current.push(marker);
    }

    // Adicionar polígonos existentes ao mapa
    if (polygons) {
      try {
        if (polygons.type === 'Polygon' && polygons.coordinates) {
          const latlngs = polygons.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
          const polygon = L.polygon(latlngs);
          drawnItemsRef.current.addLayer(polygon);
          polygonsRef.current.push(polygon);
        } else if (polygons.type === 'MultiPolygon' && polygons.coordinates) {
          polygons.coordinates.forEach((polygonCoords: number[][][]) => {
            const latlngs = polygonCoords[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
            const polygon = L.polygon(latlngs);
            drawnItemsRef.current.addLayer(polygon);
            polygonsRef.current.push(polygon);
          });
        }
      } catch (err) {
        console.error('Erro ao adicionar polígonos ao mapa:', err);
      }
    }

    // Configurar controles de desenho
    // @ts-ignore - L.Control.Draw pode não estar tipado corretamente
    const drawControl = new (L.Control as any).Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
          },
          metric: true,
          // Não há limite máximo de pontos, mas o mínimo é 3
          // O usuário pode continuar clicando para adicionar mais pontos
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: {
          icon: L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        },
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true,
        edit: {
          selectedPathOptions: {
            maintainColor: true,
          },
        },
      },
    });

    drawControl.addTo(map);
    drawControlRef.current = drawControl;

    // Event listeners
    const handleCreated = (e: L.DrawEvents.Created) => {
      const layer = e.layer;
      
      // Remover itens anteriores do mesmo tipo
      if (layer instanceof L.Marker) {
        // Remover apenas marcadores anteriores
        markersRef.current.forEach((m) => {
          if (drawnItemsRef.current.hasLayer(m)) {
            drawnItemsRef.current.removeLayer(m);
          }
        });
        markersRef.current = [];
      } else if (layer instanceof L.Polygon) {
        // Remover apenas polígonos anteriores
        polygonsRef.current.forEach((p) => {
          if (drawnItemsRef.current.hasLayer(p)) {
            drawnItemsRef.current.removeLayer(p);
          }
        });
        polygonsRef.current = [];
      }
      
      drawnItemsRef.current.addLayer(layer);
      
      if (layer instanceof L.Marker) {
        markersRef.current.push(layer);
      } else if (layer instanceof L.Polygon) {
        polygonsRef.current.push(layer);
      }
      
      onDrawCreated(e);
    };

    // @ts-ignore - Leaflet Draw events have incomplete types
    map.on(L.Draw.Event.CREATED, handleCreated);
    // @ts-ignore - Leaflet Draw events have incomplete types
    map.on(L.Draw.Event.EDITED, onDrawEdited);
    // @ts-ignore - Leaflet Draw events have incomplete types
    map.on(L.Draw.Event.DELETED, onDrawDeleted);

      return () => {
      // @ts-ignore - Leaflet Draw events have incomplete types
      map.off(L.Draw.Event.CREATED, handleCreated);
      // @ts-ignore - Leaflet Draw events have incomplete types
      map.off(L.Draw.Event.EDITED, onDrawEdited);
      // @ts-ignore - Leaflet Draw events have incomplete types
      map.off(L.Draw.Event.DELETED, onDrawDeleted);
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      map.removeLayer(drawnItemsRef.current);
    };
  }, [map, onDrawCreated, onDrawEdited, onDrawDeleted, readOnly, point, polygons, clearPreviousItems]);

  return null;
}

export default function LocationMapEditor({
  point,
  polygons,
  onPointChange,
  onPolygonsChange,
  readOnly = false,
  height = 500,
}: LocationMapEditorProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    point ? [point.latitude, point.longitude] : [-23.5505, -46.6333]
  );

  useEffect(() => {
    if (point) {
      setMapCenter([point.latitude, point.longitude]);
    }
  }, [point]);

  const handleDrawCreated = useCallback((e: L.DrawEvents.Created) => {
    const layer = e.layer;

    if (layer instanceof L.Marker) {
      const marker = layer as L.Marker;
      const latlng = marker.getLatLng();
      if (onPointChange) {
        onPointChange({ latitude: latlng.lat, longitude: latlng.lng });
      }
    } else if (layer instanceof L.Polygon) {
      const polygon = layer as L.Polygon;
      const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
      const coordinates = latlngs.map((ll) => [ll.lng, ll.lat]);
      coordinates.push(coordinates[0]); // Fechar o polígono

      const geoJson = {
        type: 'Polygon',
        coordinates: [coordinates],
      };

      if (onPolygonsChange) {
        onPolygonsChange(geoJson);
      }
    }
  }, [onPointChange, onPolygonsChange]);

  const handleDrawEdited = (e: L.DrawEvents.Edited) => {
    const layers = e.layers;
    layers.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const latlng = layer.getLatLng();
        if (onPointChange) {
          onPointChange({ latitude: latlng.lat, longitude: latlng.lng });
        }
      } else if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        const coordinates = latlngs.map((ll) => [ll.lng, ll.lat]);
        coordinates.push(coordinates[0]);

        const geoJson = {
          type: 'Polygon',
          coordinates: [coordinates],
        };

        if (onPolygonsChange) {
          onPolygonsChange(geoJson);
        }
      }
    });
  };

  const handleDrawDeleted = (e: L.DrawEvents.Deleted) => {
    const layers = e.layers;
    layers.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        if (onPointChange) {
          onPointChange(null);
        }
      } else if (layer instanceof L.Polygon) {
        if (onPolygonsChange) {
          onPolygonsChange(null);
        }
      }
    });
  };

  const handleClearAll = () => {
    if (onPointChange) onPointChange(null);
    if (onPolygonsChange) onPolygonsChange(null);
  };

  // Converter polígonos para formato de renderização
  const renderPolygons = () => {
    if (!polygons) return null;

    try {
      if (polygons.type === 'Polygon' && polygons.coordinates) {
        const positions = polygons.coordinates[0].map((coord: number[]) => [
          coord[1],
          coord[0],
        ] as [number, number]);
        return <Polygon positions={positions} pathOptions={{ color: 'blue' }} />;
      } else if (polygons.type === 'MultiPolygon' && polygons.coordinates) {
        return polygons.coordinates.map((polygonCoords: number[][][], idx: number) => {
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
      {!readOnly && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Use as ferramentas no canto superior direito para desenhar no mapa
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={handleClearAll}
          >
            Limpar Tudo
          </Button>
        </Stack>
      )}

      <Box sx={{ height, width: '100%', position: 'relative' }}>
        <MapContainer
          center={mapCenter}
          zoom={point ? 15 : 10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {point && <Marker position={[point.latitude, point.longitude]} />}
          {renderPolygons()}
          {!readOnly && (
            <DrawControl
              onDrawCreated={handleDrawCreated}
              onDrawEdited={handleDrawEdited}
              onDrawDeleted={handleDrawDeleted}
              point={point}
              polygons={polygons}
              readOnly={readOnly}
            />
          )}
        </MapContainer>
      </Box>
    </Box>
  );
}

