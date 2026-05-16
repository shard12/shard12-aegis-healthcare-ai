import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import type { HospitalRow } from '@/types/aegis';

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

const userIcon =
  typeof window !== 'undefined'
    ? L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })
    : undefined;

const hospitalIcon =
  typeof window !== 'undefined'
    ? L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#FF453A;border:2px solid #fff;box-shadow:0 0 8px rgba(255,69,58,0.8)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
    : undefined;

export function LiveMap({
  lat,
  lng,
  accuracyM,
  hospitals = [],
  heightClass = 'h-[320px]',
}: {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  hospitals?: HospitalRow[];
  heightClass?: string;
}) {
  return (
    <div
      className={['aegis-osm-dark w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black', heightClass].join(
        ' '
      )}
    >
      <MapContainer center={[lat, lng]} zoom={14} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          maxZoom={19}
          maxNativeZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userIcon ? <Marker position={[lat, lng]} icon={userIcon} /> : null}
        {hospitalIcon
          ? hospitals.map((h) => (
              <Marker key={h.id} position={[h.lat, h.lon]} icon={hospitalIcon}>
                <Popup>
                  <strong>{h.name}</strong>
                  <br />
                  {(h.distanceKm * 1000).toFixed(0)} m
                  {h.etaMinutes ? ` · ~${h.etaMinutes} min` : ''}
                </Popup>
              </Marker>
            ))
          : null}
        {accuracyM ? (
          <Circle center={[lat, lng]} radius={accuracyM} pathOptions={{ color: '#0A84FF', fillColor: '#0A84FF', fillOpacity: 0.12 }} />
        ) : null}
        <Recenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
