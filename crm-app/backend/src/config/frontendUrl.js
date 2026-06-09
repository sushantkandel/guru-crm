/**
 * Public web app URL for password-reset links and CORS hints.
 * FRONTEND_URL must include the GitHub Pages base path when used, e.g.
 * https://sushantkandel.github.io/guru-crm
 */
function getFrontendBaseUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function buildFrontendPath(path) {
  const base = getFrontendBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

function buildPasswordResetUrl(token) {
  return buildFrontendPath(`/reset-password?token=${encodeURIComponent(token)}`);
}

module.exports = { getFrontendBaseUrl, buildFrontendPath, buildPasswordResetUrl };
