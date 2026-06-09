export function formatRouteDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 1) return '< 1 min';
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}
