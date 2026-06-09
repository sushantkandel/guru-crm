/**
 * Map link helpers — Google Maps must use exact saved pin coordinates only.
 */

import { getShopCompanyLabel } from './shopPinLabel';

const NEPAL_LAT = [26, 31];
const NEPAL_LNG = [80, 89];

function inRange(value, [min, max]) {
  return value >= min && value <= max;
}

function formatCoord(value) {
  return Number(value).toFixed(7);
}

/** Encode label for Google Maps query strings (spaces as +). */
function encodeMapLabel(label) {
  return encodeURIComponent(String(label).trim()).replace(/%20/g, '+');
}

/** "lat,lng+(Name)" — pins at exact coords; Google shows Name on the marker when supported. */
function coordsWithLabel(lat, lng, label) {
  const name = encodeMapLabel(label);
  return `${formatCoord(lat)},${formatCoord(lng)}+(${name})`;
}

/**
 * Resolve WGS84 pin coordinates. Returns null unless valid Nepal-range pin exists.
 */
export function resolveShopCoords(shop = {}) {
  let lat = Number(shop.latitude);
  let lng = Number(shop.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;

  // Fix swapped lat/lng (common bug)
  if (inRange(lat, NEPAL_LNG) && inRange(lng, NEPAL_LAT)) {
    [lat, lng] = [lng, lat];
  }

  if (!inRange(lat, NEPAL_LAT) || !inRange(lng, NEPAL_LNG)) {
    return null;
  }

  return { lat, lng };
}

export function hasPinCoordinates(shop = {}) {
  return resolveShopCoords(shop) != null;
}

/** @deprecated Use hasPinCoordinates — directions require a saved pin. */
export function hasDirectionsTarget(shop = {}) {
  return hasPinCoordinates(shop);
}

export function googleMapsDestinationLabel(shop = {}) {
  return getShopCompanyLabel(shop);
}

/**
 * Google Maps driving directions to the exact saved pin with company name on the pin.
 * Uses saddr/daddr (not api=1) so coords stay exact and the label appears as "(Company)".
 * Avoid "Name@lat,lng" — that geocodes the name and can land on the wrong place.
 */
export function googleMapsDirectionsUrl(shop = {}, origin = null) {
  const dest = resolveShopCoords(shop);
  if (!dest) return null;

  const label = getShopCompanyLabel(shop);
  const daddr = coordsWithLabel(dest.lat, dest.lng, label);
  const from = origin
    ? resolveShopCoords({ latitude: origin.latitude, longitude: origin.longitude })
    : null;

  if (from) {
    const saddr = `${formatCoord(from.lat)},${formatCoord(from.lng)}`;
    return `https://www.google.com/maps?saddr=${saddr}&daddr=${daddr}&dir_action=navigate`;
  }

  return `https://www.google.com/maps?daddr=${daddr}&dir_action=navigate`;
}

/** Open Google Maps at exact pin with company name on the marker. */
export function googleMapsViewUrl(shop = {}) {
  const coords = resolveShopCoords(shop);
  if (!coords) return null;
  const q = coordsWithLabel(coords.lat, coords.lng, getShopCompanyLabel(shop));
  return `https://www.google.com/maps?q=${q}`;
}

export function openGoogleMapsDirectionsFromHere(shopArgs, { onStatus, onError, onFinally } = {}) {
  const dest = resolveShopCoords(shopArgs);
  if (!dest) {
    onError?.('No map pin saved. Open the shop, place the red pin on the map, and save.');
    onFinally?.();
    return;
  }

  const open = (origin) => {
    const url = googleMapsDirectionsUrl(shopArgs, origin);
    if (!url) {
      onError?.('Could not build directions link.');
      onFinally?.();
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    onFinally?.();
  };

  if (!navigator.geolocation) {
    open(null);
    return;
  }

  onStatus?.('Getting location…');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      open({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    () => open(null),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
  );
}
