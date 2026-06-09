import { Circle, Marker } from 'react-leaflet';
import L from '../utils/leafletSetup';
import { useLiveDeviceLocation } from '../hooks/useLiveDeviceLocation';

const blueDotIcon = L.divIcon({
  className: 'device-location-dot-wrap',
  html: '<div class="device-location-dot" aria-hidden="true"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function DeviceLocationLayer({ active, onUpdate, onError }) {
  const { position } = useLiveDeviceLocation(active, { onUpdate, onError });

  if (!position) return null;

  return (
    <>
      <Circle
        center={[position.lat, position.lng]}
        radius={position.accuracy}
        interactive={false}
        pathOptions={{
          color: '#4285F4',
          fillColor: '#4285F4',
          fillOpacity: 0.15,
          weight: 1.5,
          opacity: 0.45,
          interactive: false,
        }}
      />
      <Marker
        position={[position.lat, position.lng]}
        icon={blueDotIcon}
        interactive={false}
        zIndexOffset={1000}
      />
    </>
  );
}
