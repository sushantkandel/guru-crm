import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletSetup';
import ShopLabeledMarker from '../components/ShopLabeledMarker';
import DeviceLocationLayer from '../components/DeviceLocationLayer';
import MapRouteLayer from '../components/MapRouteLayer';
import api from '../services/api';
import NepalLocationSelect from '../components/NepalLocationSelect';
import MapLocationFocus from '../components/MapLocationFocus';
import { MapFitMarkers } from '../components/MapFlyTo';
import GoogleMapsDirectionsButton from '../components/GoogleMapsDirectionsButton';
import { resolveShopCoords } from '../utils/mapLinks';
import { formatRouteDistance, formatRouteDuration } from '../utils/routeFormat';

const defaultCenter = [27.7172, 85.324];

export default function MapPage() {
  const [shops, setShops] = useState([]);
  const [filters, setFilters] = useState({ province: '', district: '', municipality: '', ward: '' });
  const [routeShop, setRouteShop] = useState(null);
  const [livePos, setLivePos] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [autoFitRoute, setAutoFitRoute] = useState(false);
  const [plotting, setPlotting] = useState(false);

  const loadShops = useCallback(() => {
    const params = {};
    if (filters.province) params.province = filters.province;
    if (filters.district) params.district = filters.district;
    if (filters.municipality) params.municipality = filters.municipality;
    if (filters.ward) params.ward = filters.ward;
    api.get('/map/shops', { params }).then((res) => setShops(res.data));
  }, [filters]);

  useEffect(() => { loadShops(); }, [loadShops]);

  const startPlotRoute = (shop) => {
    setRouteShop(shop);
    setRouteInfo(null);
    setRouteError('');
    setAutoFitRoute(true);
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
    setRouteShop(null);
    setTracking(false);
    setRouteInfo(null);
    setRouteError('');
    setAutoFitRoute(false);
    setLivePos(null);
  };

  const mapCenter =
    shops.length > 0
      ? [shops[0].latitude, shops[0].longitude]
      : defaultCenter;

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 sm:px-6 py-4 bg-white border-b border-slate-200 flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="shrink-0 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Map</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {shops.length} shop{shops.length === 1 ? '' : 's'} · OpenStreetMap · routes from live GPS
          </p>
        </div>
        <div className="flex-1 w-full lg:max-w-3xl">
          <NepalLocationSelect
            province={filters.province}
            district={filters.district}
            municipality={filters.municipality}
            ward={filters.ward}
            onChange={(loc) => setFilters(loc)}
          />
        </div>
      </div>

      {routeShop && (
        <div className="absolute top-[4.5rem] left-1/2 z-[1000] -translate-x-1/2 max-w-lg w-[calc(100%-2rem)] rounded-lg border border-blue-200 bg-white/95 shadow-lg px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-blue-900 font-medium">
              Route to <span className="text-red-700">{routeShop.shopName}</span>
              {routeInfo && (
                <span className="text-slate-600 font-normal">
                  {' '}
                  · {formatRouteDistance(routeInfo.distanceMeters)} · ~
                  {formatRouteDuration(routeInfo.durationSeconds)}
                </span>
              )}
              {plotting && <span className="text-slate-500 font-normal"> · getting GPS…</span>}
            </div>
            <button
              type="button"
              onClick={clearRoute}
              className="text-slate-500 hover:text-slate-800 underline"
            >
              Clear route
            </button>
          </div>
          {routeError && <p className="text-amber-700 mt-1">{routeError}</p>}
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={13}
        className="w-full z-0 flex-1 min-h-[320px]"
        style={{ height: 'calc(100dvh - 7.5rem)' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapLocationFocus filters={filters} />
        <DeviceLocationLayer
          active={tracking}
          onUpdate={(pos) => {
            setLivePos(pos);
            setRouteError('');
          }}
          onError={(msg) => setRouteError(msg)}
        />
        {routeShop && livePos && (
          <MapRouteLayer
            from={livePos}
            to={{ lat: routeShop.latitude, lng: routeShop.longitude }}
            autoFit={autoFitRoute}
            onRoute={(data) => {
              setRouteInfo(data);
              setAutoFitRoute(false);
            }}
            onError={(msg) => setRouteError(msg)}
          />
        )}
        {shops.length > 0 && !filters.municipality && !routeShop && (
          <MapFitMarkers
            markers={shops.map((shop) => ({ lat: shop.latitude, lng: shop.longitude }))}
          />
        )}
        {shops.map((shop) => {
          const pin = resolveShopCoords(shop);
          return (
          <ShopLabeledMarker
            key={shop.customerId}
            shop={shop}
          >
            <Popup>
              <div className="text-sm min-w-[10rem]">
                <p className="font-bold">{shop.shopName}</p>
                <p className="text-slate-600">{shop.name}</p>
                <p className="text-slate-500">{shop.municipality}, W{shop.ward}, {shop.district}</p>
                {pin && (
                  <p className="text-slate-400 font-mono text-[10px] mt-1">
                    {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                  </p>
                )}
                <div className="mt-2 flex flex-col items-start gap-1.5">
                  <Link to={`/customers/${shop.customerId}`} className="text-blue-600 hover:underline text-xs">
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => startPlotRoute(shop)}
                    disabled={plotting}
                    className="text-blue-700 hover:underline text-xs disabled:opacity-50"
                  >
                    Plot route from my location
                  </button>
                  <GoogleMapsDirectionsButton
                    shop={shop}
                    label="Get Directions"
                    className="text-green-700 hover:underline text-xs disabled:opacity-50"
                  />
                </div>
              </div>
            </Popup>
          </ShopLabeledMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
