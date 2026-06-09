import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from '../utils/leafletSetup';

export function MapRecenterOnDevice({ position, recenterToken }) {
  const map = useMap();

  useEffect(() => {
    if (!recenterToken || !position) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 18), { duration: 0.5 });
  }, [recenterToken, position, map]);

  return null;
}

export function MapLiveFollow({ position, follow, minMoveMeters = 8 }) {
  const map = useMap();
  const lastRef = useRef(null);

  useEffect(() => {
    if (!follow || !position) return;

    const latlng = L.latLng(position.lat, position.lng);
    if (lastRef.current) {
      const moved = lastRef.current.distanceTo(latlng);
      if (moved < minMoveMeters) return;
    }

    lastRef.current = latlng;
    map.panTo(latlng, { animate: true, duration: 0.35 });
  }, [position, follow, map, minMoveMeters]);

  return null;
}

export function MapStopFollowOnPan({ onStopFollow }) {
  useMapEvents({
    dragstart() {
      onStopFollow?.();
    },
  });
  return null;
}
