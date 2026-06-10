/** Decode email and name from a Google ID token (JWT) credential. */
export function parseGoogleCredential(credential) {
  if (!credential || typeof credential !== 'string') {
    return { email: '', ownerName: '' };
  }
  try {
    const payload = credential.split('.')[1];
    if (!payload) return { email: '', ownerName: '' };
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(normalized));
    return {
      email: json.email || '',
      ownerName: json.name || '',
    };
  } catch {
    return { email: '', ownerName: '' };
  }
}
