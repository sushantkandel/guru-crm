import { useEffect, useMemo, useRef } from 'react';
import { Marker } from 'react-leaflet';
import { createShopPinIcon } from '../utils/leafletSetup';
import { getShopCompanyLabel } from '../utils/shopPinLabel';
import { resolveShopCoords } from '../utils/mapLinks';

export default function ShopLabeledMarker({
  position,
  label,
  shop,
  zIndexOffset = 2500,
  draggable = false,
  eventHandlers,
  children,
}) {
  const markerRef = useRef(null);
  const companyLabel = getShopCompanyLabel(shop || { shopName: label });

  const markerPosition = useMemo(() => {
    const fromShop = shop ? resolveShopCoords(shop) : null;
    if (fromShop) return [fromShop.lat, fromShop.lng];
    if (Array.isArray(position) && position.length === 2) return position;
    if (position?.lat != null && position?.lng != null) return [position.lat, position.lng];
    return position;
  }, [shop, position]);

  const icon = useMemo(() => createShopPinIcon(companyLabel), [companyLabel]);

  useEffect(() => {
    markerRef.current?.setIcon(icon);
  }, [icon]);

  useEffect(() => {
    if (markerRef.current && markerPosition) {
      markerRef.current.setLatLng(markerPosition);
    }
  }, [markerPosition]);

  if (!markerPosition) return null;

  return (
    <Marker
      ref={markerRef}
      position={markerPosition}
      icon={icon}
      zIndexOffset={zIndexOffset}
      draggable={draggable}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
}
