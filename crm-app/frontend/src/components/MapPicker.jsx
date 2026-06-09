import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletSetup';
import ShopLabeledMarker from './ShopLabeledMarker';
import { getShopCompanyLabel } from '../utils/shopPinLabel';
import api from '../services/api';
import DeviceLocationLayer from './DeviceLocationLayer';
import { MapLiveFollow, MapRecenterOnDevice, MapStopFollowOnPan } from './MapFollowDevice';
import { MapFlyTo } from './MapFlyTo';
import MapLocationFocus from './MapLocationFocus';

const defaultCenter = [27.7172, 85.324];

function MapClickHandler({ onShopPinPlace }) {
  useMapEvents({
    click(e) {
      onShopPinPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function coordsEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
}

export default function MapPicker({
  latitude,
  longitude,
  addressText,
  shopLabel,
  locationFilters,
  onLocationChange,
}) {
  const [geocoding, setGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsInfo, setGpsInfo] = useState('');
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [shopPinLocked, setShopPinLocked] = useState(Boolean(latitude != null && longitude != null));
  const [trackingActive, setTrackingActive] = useState(false);
  const [followLive, setFollowLive] = useState(false);
  const [devicePos, setDevicePos] = useState(null);
  const [recenterToken, setRecenterToken] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [flyToShop, setFlyToShop] = useState(null);
  const [shopPin, setShopPin] = useState(() =>
    latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null
  );

  useEffect(() => {
    const next =
      latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;
    setShopPin((prev) => (coordsEqual(prev, next) ? prev : next));
    if (next) setShopPinLocked(true);
  }, [latitude, longitude]);

  const shopPinPosition = shopPin ? [shopPin.lat, shopPin.lng] : null;

  const hasAddressFilters = Boolean(locationFilters?.municipality);
  const autoFocusLocation = hasAddressFilters && !shopPinLocked;

  const placeShopPin = useCallback(
    (lat, lng, { fly = true } = {}) => {
      const next = { lat: Number(lat), lng: Number(lng) };
      setShopPin(next);
      onLocationChange(next.lat, next.lng);
      setShopPinLocked(true);
      setFollowLive(false);
      setGpsInfo('Red pin = shop location saved. Drag it to adjust.');
      setGpsError('');
      if (fly) setFlyToShop([next.lat, next.lng]);
    },
    [onLocationChange]
  );

  const startLiveTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS is not supported on this device or browser.');
      return;
    }
    setGpsError('');
    setGpsInfo('Blue dot = you. Tap the map to place the red shop pin.');
    setGpsStatus('acquiring');
    setTrackingActive(true);
  }, []);

  const handleDeviceUpdate = useCallback((next) => {
    setDevicePos(next);
    setGpsStatus('live');
    if (!shopPinLocked) {
      setGpsInfo('Blue dot = you. Tap anywhere on the map to drop the red shop pin.');
    }
    setGpsError('');
  }, [shopPinLocked]);

  const handleDeviceError = useCallback((message) => {
    setGpsError(message);
    setGpsStatus('error');
    setFollowLive(false);
  }, []);

  useEffect(() => {
    startLiveTracking();
  }, [startLiveTracking]);

  const handleGeocode = async () => {
    if (!addressText) return;
    const ok = window.confirm(
      'This places the pin at an approximate address center, not the exact shop entrance. ' +
        'For accurate directions, tap the map at the shop door instead. Continue?'
    );
    if (!ok) return;
    setGeocoding(true);
    setGpsError('');
    try {
      const res = await api.post('/map/geocode', { address: addressText });
      placeShopPin(res.data.latitude, res.data.longitude);
    } catch (err) {
      alert(err.response?.data?.error || 'Geocoding failed');
    } finally {
      setGeocoding(false);
    }
  };

  const handleRecenterOnDevice = () => {
    setFollowLive(true);
    setRecenterToken((token) => token + 1);
  };

  const handlePinShopAtDevice = () => {
    if (!devicePos) return;
    placeShopPin(devicePos.lat, devicePos.lng);
  };

  const handleClearPin = () => {
    setShopPin(null);
    onLocationChange(null, null);
    setShopPinLocked(false);
    setFlyToShop(null);
    setGpsInfo('Shop pin cleared. Tap the map to place the red pin at the shop.');
  };

  const addressKey = useMemo(() => addressText, [addressText]);

  useEffect(() => {
    if (!addressKey || shopPinLocked) return undefined;

    const parts = addressKey.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 4) return undefined;

    const timer = setTimeout(() => {
      api
        .post('/map/geocode', { address: addressKey })
        .then((res) => {
          setMapCenter([res.data.latitude, res.data.longitude]);
        })
        .catch(() => {});
    }, 700);

    return () => clearTimeout(timer);
  }, [addressKey, shopPinLocked]);

  const statusLabel =
    gpsStatus === 'acquiring'
      ? 'Getting GPS…'
      : gpsStatus === 'live'
        ? 'Live location on'
        : gpsStatus === 'error'
          ? 'GPS off'
          : 'Starting GPS…';

  const mapViewCenter = followLive && devicePos
    ? null
    : flyToShop || shopPinPosition || mapCenter;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button
          type="button"
          onClick={startLiveTracking}
          className={`text-xs font-medium px-3 py-1.5 rounded-md text-white hover:opacity-90 ${
            trackingActive && gpsStatus === 'live'
              ? 'bg-blue-700 ring-2 ring-blue-300'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {statusLabel}
        </button>
        {devicePos && (
          <button
            type="button"
            onClick={handlePinShopAtDevice}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Pin shop at my location
          </button>
        )}
        {addressText && (
          <button
            type="button"
            onClick={handleGeocode}
            disabled={geocoding}
            className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {geocoding ? 'Finding...' : 'Find shop from address'}
          </button>
        )}
        {shopPinPosition && (
          <button
            type="button"
            onClick={handleClearPin}
            className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50"
          >
            Clear shop pin
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="map-legend-dot map-legend-dot--device" />
          Blue dot — you (live GPS)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="map-legend-dot map-legend-dot--shop" />
          Red pin — company name (tap map to place)
        </span>
      </div>

      {devicePos && (
        <p className="text-xs text-slate-600 mb-1 font-mono">
          You: {devicePos.lat.toFixed(6)}, {devicePos.lng.toFixed(6)}
          {followLive ? ' · map follows you' : ''}
        </p>
      )}

      {shopPinPosition && (
        <p className="text-xs text-red-700 mb-2 font-mono font-medium">
          Shop pin: {shopPin.lat.toFixed(6)}, {shopPin.lng.toFixed(6)}
        </p>
      )}

      {!shopPinPosition && trackingActive && (
        <p className="text-xs text-slate-500 mb-2">Tap the map to drop the red shop pin.</p>
      )}

      {gpsInfo && <p className="text-xs text-green-700 mb-2">{gpsInfo}</p>}
      {gpsError && (
        <p className="text-xs text-amber-700 mb-2">
          {gpsError}
          {' '}
          <button type="button" className="underline" onClick={startLiveTracking}>
            Retry GPS
          </button>
        </p>
      )}

      <div className="relative">
        <MapContainer
          center={defaultCenter}
          zoom={14}
          className="w-full rounded-lg z-0"
          style={{ height: '340px' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {autoFocusLocation && (
            <MapLocationFocus filters={locationFilters} />
          )}
          <MapFlyTo
            center={mapViewCenter}
            zoom={shopPinPosition ? 17 : 14}
            enabled={!followLive}
          />
          <MapRecenterOnDevice position={devicePos} recenterToken={recenterToken} />
          <MapLiveFollow position={devicePos} follow={followLive && trackingActive} />
          <MapStopFollowOnPan onStopFollow={() => setFollowLive(false)} />
          <DeviceLocationLayer
            active={trackingActive}
            onUpdate={handleDeviceUpdate}
            onError={handleDeviceError}
          />
          <MapClickHandler onShopPinPlace={(lat, lng) => placeShopPin(lat, lng)} />
          {shopPinPosition && (
            <ShopLabeledMarker
              position={shopPinPosition}
              shop={{ shopName: getShopCompanyLabel({ shopName: shopLabel }) }}
              draggable
              eventHandlers={{
                dragstart: () => setFollowLive(false),
                dragend: (event) => {
                  const { lat, lng } = event.target.getLatLng();
                  placeShopPin(lat, lng, { fly: false });
                },
              }}
            />
          )}
        </MapContainer>

        {trackingActive && (
          <button
            type="button"
            onClick={handleRecenterOnDevice}
            disabled={!devicePos}
            className="map-recenter-btn absolute bottom-4 right-4 z-[1000] disabled:opacity-40"
            title="Center map on my location (blue dot only)"
            aria-label="Center map on my location"
          >
            <LocateIcon />
          </button>
        )}

        {trackingActive && gpsStatus === 'acquiring' && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-white/95 px-3 py-1.5 text-xs text-blue-700 shadow border border-blue-100">
            Acquiring GPS signal…
          </div>
        )}
      </div>
    </div>
  );
}
