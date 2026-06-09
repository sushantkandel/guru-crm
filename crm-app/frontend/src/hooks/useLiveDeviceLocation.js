import { useEffect, useRef, useState } from 'react';
import { formatLocationError } from '../utils/deviceLocation';

function toDevicePosition(pos) {
  const { latitude, longitude, accuracy } = pos.coords;
  return {
    lat: latitude,
    lng: longitude,
    accuracy: Math.max(accuracy || 30, 8),
    updatedAt: pos.timestamp || Date.now(),
  };
}

/**
 * Continuous device GPS watch with fast cached fix + high-accuracy refinement.
 * Callback refs avoid restarting the watch on parent re-renders.
 */
export function useLiveDeviceLocation(active, { onUpdate, onError } = {}) {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const onUpdateRef = useRef(onUpdate);
  const onErrorRef = useRef(onError);
  onUpdateRef.current = onUpdate;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!active) {
      setStatus('idle');
      setError('');
      return undefined;
    }

    if (!navigator.geolocation) {
      const message = 'GPS is not supported on this device or browser.';
      setError(message);
      setStatus('error');
      onErrorRef.current?.(message);
      return undefined;
    }

    let cancelled = false;
    let watchId = null;
    let usingHighAccuracy = true;
    let hasFix = false;

    const publish = (next) => {
      if (cancelled) return;
      hasFix = true;
      setPosition(next);
      setStatus('live');
      setError('');
      onUpdateRef.current?.(next);
    };

    const fail = (geoError, stopTracking = false) => {
      if (cancelled) return;
      if (!stopTracking && hasFix) return;
      const message = formatLocationError(geoError);
      setError(message);
      setStatus('error');
      onErrorRef.current?.(message);
      if (stopTracking && watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const clearWatch = () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const startWatch = (highAccuracy) => {
      clearWatch();
      usingHighAccuracy = highAccuracy;
      setStatus('acquiring');

      watchId = navigator.geolocation.watchPosition(
        (pos) => publish(toDevicePosition(pos)),
        (geoError) => {
          if (geoError.code === 1) {
            fail(geoError, true);
            return;
          }
          if (usingHighAccuracy) {
            startWatch(false);
            return;
          }
          fail(geoError, geoError.code === 1);
        },
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: highAccuracy ? 0 : 15000,
          timeout: highAccuracy ? 60000 : 30000,
        }
      );
    };

    setStatus('acquiring');
    setError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => publish(toDevicePosition(pos)),
      () => {},
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
    );

    startWatch(true);

    return () => {
      cancelled = true;
      clearWatch();
      setPosition(null);
      setStatus('idle');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only start/stop with `active`
  }, [active]);

  return { position, status, error };
}
