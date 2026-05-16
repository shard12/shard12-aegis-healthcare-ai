import { useEffect, useRef, useState } from 'react';

export type GeoState = {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  mapsUrl: string;
};

export function useGeolocation(watch: boolean) {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    mapsUrl: '',
  });
  const idRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation not supported' }));
      return;
    }
    const onOk: PositionCallback = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      setState({
        lat,
        lng,
        accuracy,
        error: null,
        mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
      });
    };
    const onErr: PositionErrorCallback = (e) => {
      setState((s) => ({ ...s, error: e.message || 'Location error' }));
    };
    const opts: PositionOptions = { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 };
    if (watch) {
      idRef.current = navigator.geolocation.watchPosition(onOk, onErr, opts);
    } else {
      navigator.geolocation.getCurrentPosition(onOk, onErr, opts);
    }
    return () => {
      if (idRef.current != null) navigator.geolocation.clearWatch(idRef.current);
    };
  }, [watch]);

  return state;
}
