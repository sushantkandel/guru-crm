import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from '../utils/leafletSetup';

function centerKey(center, zoom) {
  if (!center) return '';
  return `${center[0].toFixed(6)},${center[1].toFixed(6)}@${zoom}`;
}

export function MapFlyTo({ center, zoom = 14, enabled = true }) {
  const map = useMap();
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!enabled || !center) return;
    const key = centerKey(center, zoom);
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map, enabled]);

  return null;
}

export function MapFitMarkers({ markers, padding = [48, 48] }) {
  const map = useMap();

  useEffect(() => {
    if (!markers?.length) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding });
    }
  }, [markers, map, padding]);

  return null;
}
