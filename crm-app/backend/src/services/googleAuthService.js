const { OAuth2Client } = require('google-auth-library');

function getClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  return new OAuth2Client(clientId);
}

async function verifyGoogleToken(credential) {
  const client = getClient();
  if (!client) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID in backend .env');
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error('Google account has no email');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    emailVerified: payload.email_verified,
  };
}

module.exports = { verifyGoogleToken };
