import { fetchHospitalsNearby, reverseGeocode } from '../services/osmService.js';

/** Hospitals: OpenStreetMap (Overpass + Nominatim fallback, no API keys). */
export async function hospitals(req, res) {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon || req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat and lon required' });
    }
    const rows = await fetchHospitalsNearby(lat, lon);
    const label = (await reverseGeocode(lat, lon)) || `Near ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    res.json({
      label,
      hospitals: rows,
      source: rows.length ? 'osm' : 'none',
      hint: rows.length ? undefined : 'No facilities found in this area. Try moving the map or increasing search radius.',
    });
  } catch (e) {
    console.error('[AEGIS-HOSPITALS]', e?.message || e);
    res.status(500).json({ error: e.message || 'Hospital lookup failed' });
  }
}
