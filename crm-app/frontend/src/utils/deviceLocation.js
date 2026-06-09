const TIMEOUT = 3;

function tryWatchPosition(options, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 0, message: 'Geolocation is not supported.' });
      return;
    }

    let settled = false;
    let watchId = null;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      fn(value);
    };

    const timer = setTimeout(() => {
      finish(reject, { code: TIMEOUT, message: 'Timed out waiting for location.' });
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => finish(resolve, position),
      (error) => finish(reject, error),
      options
    );
  });
}

function tryGetCurrentPosition(options, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 0, message: 'Geolocation is not supported.' });
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject({ code: TIMEOUT, message: 'Timed out waiting for location.' });
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(position);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
      options
    );
  });
}

/**
 * Progressive device location: precise GPS first, then network/Wi‑Fi, then recent cache.
 * Works better on laptops indoors and on phones with weak GPS signal.
 */
export async function getDeviceLocation(onProgress) {
  const attempts = [
    {
      label: 'Trying GPS (high accuracy)...',
      run: () =>
        tryWatchPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 28000 }, 30000),
    },
    {
      label: 'Trying network location...',
      run: () =>
        tryWatchPosition({ enableHighAccuracy: false, maximumAge: 120000 }, 15000),
    },
    {
      label: 'Trying last known position...',
      run: () =>
        tryGetCurrentPosition({ enableHighAccuracy: false, maximumAge: 600000 }, 8000),
    },
  ];

  let lastError = { code: TIMEOUT, message: 'Could not get your location.' };

  for (const attempt of attempts) {
    onProgress?.(attempt.label);
    try {
      const position = await attempt.run();
      return { position, mode: attempt.label };
    } catch (error) {
      lastError = error;
      if (error?.code === 1) break;
    }
  }

  throw lastError;
}

export function formatLocationError(error) {
  const code = error?.code;
  switch (code) {
    case 1:
      return 'Location permission denied. Allow location access in your browser or device settings.';
    case 2:
      return 'Location unavailable. Tap the map to drop a pin, or use Find from address.';
    case TIMEOUT:
    case 3:
      return 'Could not get GPS in time. Tap the map where you are standing, or use Find from address. On a laptop, network location often fails — a phone works best.';
    default:
      return 'Could not get your location. Tap the map to set the pin manually.';
  }
}
