/**
 * Public web app URL for password-reset links and CORS hints.
 * FRONTEND_URL must include the GitHub Pages base path when used, e.g.
 * https://sushantkandel.github.io/guru-crm
 */
const DEFAULT_GITHUB_PAGES_REPO = 'guru-crm';

function normalizeFrontendBaseUrl(raw) {
  const base = (raw || 'http://localhost:5173').trim().replace(/\/$/, '');

  // GitHub project pages live at https://user.github.io/REPO — not at the domain root.
  const githubProjectRoot = base.match(/^(https:\/\/[^/]+\.github\.io)$/i);
  if (githubProjectRoot) {
    const repo = (process.env.GITHUB_PAGES_REPO || DEFAULT_GITHUB_PAGES_REPO).replace(/^\/|\/$/g, '');
    return `${githubProjectRoot[1]}/${repo}`;
  }

  return base;
}

function getFrontendBaseUrl() {
  return normalizeFrontendBaseUrl(process.env.FRONTEND_URL);
}

function buildFrontendPath(path) {
  const base = getFrontendBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

function buildPasswordResetUrl(token) {
  return buildFrontendPath(`/reset-password?token=${encodeURIComponent(token)}`);
}

module.exports = {
  getFrontendBaseUrl,
  buildFrontendPath,
  buildPasswordResetUrl,
  normalizeFrontendBaseUrl,
};
