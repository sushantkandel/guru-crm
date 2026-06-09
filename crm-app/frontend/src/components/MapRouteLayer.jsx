import { useEffect, useRef, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from '../utils/leafletSetup';
import api from '../services/api';
import { resolveShopCoords } from '../utils/mapLinks';

function FitRouteBounds({ geometry, enabled }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !geometry?.coordinates?.length) return;
    const layer = L.geoJSON(geometry);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 16 });
    }
  }, [geometry, enabled, map]);

  return null;
}

const MIN_REFETCH_METERS = 40;

export default function MapRouteLayer({
  from,
  to,
  onRoute,
  onError,
  autoFit = false,
}) {
  const [geometry, setGeometry] = useState(null);
  const lastFetchFromRef = useRef(null);
  const onRouteRef = useRef(onRoute);
  const onErrorRef = useRef(onError);
  onRouteRef.current = onRoute;
  onErrorRef.current = onError;

  useEffect(() => {
    const fromCoords = from ? resolveShopCoords({ latitude: from.lat, longitude: from.lng }) : null;
    const toCoords = to ? resolveShopCoords({ latitude: to.lat, longitude: to.lng }) : null;

    if (!fromCoords || !toCoords) {
      setGeometry(null);
      lastFetchFromRef.current = null;
      return undefined;
    }

    const last = lastFetchFromRef.current;
    if (last) {
      const moved = L.latLng(last.lat, last.lng).distanceTo(L.latLng(fromCoords.lat, fromCoords.lng));
      if (moved < MIN_REFETCH_METERS) {
        return undefined;
      }
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .get('/map/route', {
          params: {
            fromLat: fromCoords.lat,
            fromLng: fromCoords.lng,
            toLat: toCoords.lat,
            toLng: toCoords.lng,
          },
        })
        .then((res) => {
          if (cancelled) return;
          lastFetchFromRef.current = { lat: fromCoords.lat, lng: fromCoords.lng };
          setGeometry(res.data.geometry);
          onRouteRef.current?.(res.data);
        })
        .catch((err) => {
          if (cancelled) return;
          setGeometry(null);
          onErrorRef.current?.(err.response?.data?.error || 'Could not plot route');
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  useEffect(() => {
    lastFetchFromRef.current = null;
    setGeometry(null);
  }, [to?.lat, to?.lng]);

  if (!geometry) return null;

  return (
    <>
      <GeoJSON
        data={geometry}
        style={{
          color: '#2563eb',
          weight: 5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <FitRouteBounds geometry={geometry} enabled={autoFit} />
    </>
  );
}
