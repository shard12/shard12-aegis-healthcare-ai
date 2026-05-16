import axios from 'axios';
import { config } from '../config/index.js';

const UA = { headers: { 'User-Agent': config.osmUserAgent } };

const AVG_DRIVE_KMH = 40;
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function etaMinutes(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  return Math.max(1, Math.round((distanceKm / AVG_DRIVE_KMH) * 60));
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function mapElement(el, lat, lon) {
  const tags = el.tags || {};
  const name = tags.name || tags['name:en'] || tags.operator || 'Medical facility';
  const type = tags.amenity || tags.healthcare || 'hospital';
  let plat = el.lat;
  let plon = el.lon;
  if (el.center) {
    plat = el.center.lat;
    plon = el.center.lon;
  }
  if (typeof plat !== 'number' || typeof plon !== 'number') return null;
  const distanceKm = haversineKm(lat, lon, plat, plon);
  const tagStr = JSON.stringify(tags).toLowerCase();
  const traumaCenter =
    tags.emergency === 'yes' ||
    /trauma|level\s*i\b|level_1/.test(tagStr) ||
    String(tags['healthcare:speciality'] || '').includes('trauma');
  const cardiacCenter =
    /cardiac|heart|cardiology/.test(tagStr) || String(tags['healthcare:speciality'] || '').includes('cardiology');
  return {
    id: `${el.type || 'node'}-${el.id}`,
    name,
    type,
    lat: plat,
    lon: plon,
    distanceKm,
    etaMinutes: etaMinutes(distanceKm),
    traumaCenter: Boolean(traumaCenter),
    cardiacCenter: Boolean(cardiacCenter),
    emergency: tags.emergency === 'yes' || tags.amenity === 'hospital',
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${plat},${plon}`,
    osmUrl: `https://www.openstreetmap.org/${el.type || 'node'}/${el.id}`,
  };
}

function dedupeRows(rows) {
  const dedup = [];
  const seen = new Set();
  for (const r of rows) {
    const key = `${r.name}-${r.lat.toFixed(4)}-${r.lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(r);
  }
  dedup.sort((a, b) => a.distanceKm - b.distanceKm);
  return dedup.slice(0, 40);
}

export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  try {
    const { data } = await axios.get(url, { ...UA, timeout: 12000 });
    return data?.display_name || '';
  } catch {
    return '';
  }
}

async function overpassQuery(lat, lon, radiusM, endpoint) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radiusM},${lat},${lon});
      way["amenity"="hospital"](around:${radiusM},${lat},${lon});
      node["amenity"="clinic"](around:${radiusM},${lat},${lon});
      way["amenity"="clinic"](around:${radiusM},${lat},${lon});
      node["healthcare"="hospital"](around:${radiusM},${lat},${lon});
      way["healthcare"="hospital"](around:${radiusM},${lat},${lon});
      node["emergency"="yes"](around:${radiusM},${lat},${lon});
    );
    out center tags;
  `.trim();
  const { data } = await axios.post(endpoint, `data=${encodeURIComponent(query)}`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': config.osmUserAgent },
    timeout: 28000,
  });
  const rows = [];
  for (const el of data?.elements || []) {
    const row = mapElement(el, lat, lon);
    if (row) rows.push(row);
  }
  return dedupeRows(rows);
}

/** Nominatim search fallback when Overpass is down or rate-limited. */
async function nominatimHospitalSearch(lat, lon) {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q: 'hospital',
      format: 'jsonv2',
      limit: '25',
      viewbox: `${lon - 0.15},${lat + 0.15},${lon + 0.15},${lat - 0.15}`,
      bounded: '1',
    }).toString();
  const { data } = await axios.get(url, { ...UA, timeout: 15000 });
  const rows = [];
  for (const item of data || []) {
    const plat = Number(item.lat);
    const plon = Number(item.lon);
    if (!Number.isFinite(plat) || !Number.isFinite(plon)) continue;
    const distanceKm = haversineKm(lat, lon, plat, plon);
    rows.push({
      id: `nominatim-${item.place_id}`,
      name: item.display_name?.split(',')[0] || 'Hospital',
      type: item.type || 'hospital',
      lat: plat,
      lon: plon,
      distanceKm,
      etaMinutes: etaMinutes(distanceKm),
      traumaCenter: /hospital|emergency/i.test(item.type || ''),
      cardiacCenter: false,
      emergency: true,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${plat},${plon}`,
      osmUrl: `https://www.openstreetmap.org/?mlat=${plat}&mlon=${plon}`,
    });
  }
  return dedupeRows(rows);
}

/**
 * Reliable hospital lookup: multiple Overpass mirrors → Nominatim fallback.
 * Always returns an array (never { error }).
 */
export async function fetchHospitalsNearby(lat, lon, radiusM = 10000) {
  const plat = Number(lat);
  const plon = Number(lon);
  if (!Number.isFinite(plat) || !Number.isFinite(plon)) return [];

  const errors = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const rows = await overpassQuery(plat, plon, radiusM, endpoint);
      if (rows.length) return rows;
    } catch (e) {
      errors.push(`${endpoint}: ${e.message}`);
    }
  }

  try {
    const fallback = await nominatimHospitalSearch(plat, plon);
    if (fallback.length) return fallback;
  } catch (e) {
    errors.push(`nominatim: ${e.message}`);
  }

  if (errors.length) console.warn('[AEGIS-OSM] hospital lookup failed:', errors.join(' | '));
  return [];
}

/** @deprecated Use fetchHospitalsNearby */
export async function fetchHospitalsOverpass(lat, lon, radiusM = 10000) {
  return fetchHospitalsNearby(lat, lon, radiusM);
}
