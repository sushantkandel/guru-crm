import { useState } from 'react';
import { hasPinCoordinates, openGoogleMapsDirectionsFromHere, resolveShopCoords } from '../utils/mapLinks';

export default function GoogleMapsDirectionsButton({
  shop,
  className = '',
  label = 'Get Directions',
  busyLabel = 'Getting location…',
  showCoords = true,
}) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');

  const pin = hasPinCoordinates(shop) ? resolveShopCoords(shop) : null;
  if (!pin) return null;

  const handleClick = () => {
    setBusy(true);
    setHint('');
    openGoogleMapsDirectionsFromHere(shop, {
      onStatus: () => setHint(busyLabel),
      onError: (message) => setHint(message),
      onFinally: () => setBusy(false),
    });
  };

  return (
    <span className={showCoords ? 'inline-flex flex-col items-start gap-0.5' : 'inline-flex'}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={className}
      >
        {busy ? busyLabel : label}
      </button>
      {hint && !busy && (
        <span className="text-xs text-amber-700">{hint}</span>
      )}
      {showCoords && !busy && (
        <span className="text-[10px] text-slate-400 font-mono">
          Pin: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
        </span>
      )}
    </span>
  );
}
