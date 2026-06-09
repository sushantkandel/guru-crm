import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import api from '../services/api';

function buildSearchQuery(filters) {
  const { province, district, municipality, ward } = filters;
  const parts = [];
  if (ward) parts.push(`Ward ${ward}`);
  if (municipality) parts.push(municipality);
  if (district) parts.push(district);
  if (province) parts.push(province);
  parts.push('Nepal');
  return parts.join(', ');
}

export default function MapLocationFocus({ filters, enabled = true }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return undefined;

    const { province, district, municipality } = filters;
    if (!province && !district && !municipality) return undefined;

    const query = buildSearchQuery(filters);
    if (!query) return undefined;

    let cancelled = false;
    api
      .post('/map/geocode', { address: query })
      .then((res) => {
        if (cancelled) return;
        const next = [res.data.latitude, res.data.longitude];
        const zoom = municipality ? 13 : district ? 10 : 8;
        map.flyTo(next, zoom, { duration: 0.8 });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [filters, enabled, map]);

  return null;
}
