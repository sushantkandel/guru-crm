import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

const PIN_W = 32;
const PIN_H = 42;

const PIN_SVG = `
  <svg class="shop-pin-svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 32 42" aria-hidden="true">
    <path fill="#dc2626" stroke="#991b1b" stroke-width="1.5"
      d="M16 1C8.82 1 3 6.82 3 14c0 9.75 13 27 13 27s13-17.25 13-27C29 6.82 23.18 1 16 1z"/>
    <circle cx="16" cy="14" r="5.5" fill="#fff"/>
  </svg>
`;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateLabel(text, max = 40) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 'Company';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function labelWidth(text) {
  const len = String(text || 'Company').length;
  return Math.min(240, Math.max(PIN_W, len * 7.5 + 28));
}

/** Red shop pin without label (fallback). */
export const shopPinIcon = L.divIcon({
  className: 'shop-pin-wrap',
  html: PIN_SVG,
  iconSize: [PIN_W, PIN_H],
  iconAnchor: [PIN_W / 2, PIN_H],
  popupAnchor: [0, -PIN_H],
});

/**
 * Red shop pin with company label.
 * iconAnchor is the pin TIP — same point saved as latitude/longitude.
 */
export function createShopPinIcon(label) {
  const plain = truncateLabel(label);
  const display = escapeHtml(plain);
  const boxW = labelWidth(plain);
  const labelH = 28;
  const totalH = labelH + PIN_H;

  return L.divIcon({
    className: 'shop-pin-labeled-wrap',
    html: `
      <div class="shop-pin-labeled" style="width:${boxW}px;height:${totalH}px">
        <div class="shop-pin-label" title="${display}">${display}</div>
        ${PIN_SVG}
      </div>
    `,
    iconSize: [boxW, totalH],
    iconAnchor: [boxW / 2, totalH],
    popupAnchor: [0, -totalH],
  });
}

export default L;
