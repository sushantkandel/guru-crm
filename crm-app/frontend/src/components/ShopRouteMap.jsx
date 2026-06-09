import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletSetup';
import { resolveShopCoords } from '../utils/mapLinks';
import DeviceLocationLayer from './DeviceLocationLayer';
import MapRouteLayer from './MapRouteLayer';
import ShopLabeledMarker from './ShopLabeledMarker';
import GoogleMapsDirectionsButton from './GoogleMapsDirectionsButton';
import { formatRouteDistance, formatRouteDuration } from '../utils/routeFormat';

const defaultCenter = [27.7172, 85.324];

export default function ShopRouteMap({ shop, height = 320 }) {
  const [tracking, setTracking] = useState(false);
  const [plotRoute, setPlotRoute] = useState(false);
  const [livePos, setLivePos] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [autoFit, setAutoFit] = useState(false);
  const [plotting, setPlotting] = useState(false);

  const pin = resolveShopCoords(shop);
  if (!pin) {
    return (
      <p className="text-sm text-slate-500">
        Add a map pin on the shop to plot a driving route.
      </p>
    );
  }

  const center = [pin.lat, pin.lng];
  const shopTarget = { lat: pin.lat, lng: pin.lng };

  const startPlotRoute = () => {
    setRouteError('');
    setRouteInfo(null);
    setAutoFit(true);
    setPlotting(true);

    if (!navigator.geolocation) {
      setRouteError('GPS is not available on this device.');
      setPlotting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLivePos({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setTracking(true);
        setPlotRoute(true);
        setPlotting(false);
      },
      () => {
        setRouteError('Allow location access to plot a route from where you are.');
        setPlotting(false);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );
  };

  const clearRoute = () => {
    setPlotRoute(false);
    setTracking(false);
    setRouteInfo(null);
    setRouteError('');
    setAutoFit(false);
    setLivePos(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button
          type="button"
          onClick={startPlotRoute}
          disabled={plotting}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {plotting ? 'Getting your location…' : 'Plot route from my location'}
        </button>
        {plotRoute && (
          <button
            type="button"
            onClick={clearRoute}
            className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Clear route
          </button>
        )}
        <GoogleMapsDirectionsButton
          shop={shop}
          label="Get Directions"
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        />
      </div>

      {routeInfo && (
        <p className="text-xs text-blue-800 mb-2 font-medium">
          Driving route: {formatRouteDistance(routeInfo.distanceMeters)} · ~
          {formatRouteDuration(routeInfo.durationSeconds)}
          {plotRoute && livePos ? ' · updates as you move' : ''}
        </p>
      )}

      {routeError && <p className="text-xs text-amber-700 mb-2">{routeError}</p>}

      <p className="text-xs text-slate-500 mb-2">
        Blue dot = you · Red pin = shop · Blue line = driving path
      </p>

      <MapContainer
        center={center}
        zoom={15}
        className="w-full rounded-lg z-0"
        style={{ height }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ShopLabeledMarker position={center} shop={shop} />
        <DeviceLocationLayer
          active={tracking}
          onUpdate={(pos) => {
            setLivePos(pos);
            setRouteError('');
          }}
          onError={(msg) => setRouteError(msg)}
        />
        {plotRoute && livePos && (
          <MapRouteLayer
            from={livePos}
            to={shopTarget}
            autoFit={autoFit}
            onRoute={(data) => {
              setRouteInfo(data);
              setAutoFit(false);
            }}
            onError={(msg) => setRouteError(msg)}
          />
        )}
      </MapContainer>
    </div>
  );
}
