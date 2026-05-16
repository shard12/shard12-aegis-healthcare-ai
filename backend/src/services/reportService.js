/**
 * Persist generated PDFs under uploads/reports and expose stable public URLs.
 * All filesystem work is defensive — failures bubble as structured results, not process crashes.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** backend/uploads/reports (from backend/src/services) */
export const REPORTS_DIR = path.resolve(__dirname, '../../uploads/reports');

/**
 * @param {'TRIAGE'|'SOS'|'SUMMARY'|'DISPATCH'} kind
 * @returns {string} e.g. AEGIS_TRIAGE_2026_05_14_1033.pdf
 */
export function makeReportFilename(kind) {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `AEGIS_${kind}_${y}_${mo}_${day}_${hh}${mm}.pdf`;
}

/** Browser-relative URL (Vite should proxy /uploads → backend). */
export function reportPublicPath(filename) {
  return `/uploads/reports/${encodeURIComponent(filename)}`;
}

/** Absolute URL for email / external systems. */
export function reportAbsoluteUrl(filename) {
  const base = String(config.apiPublicBaseUrl || '').replace(/\/+$/, '');
  return `${base}${reportPublicPath(filename)}`;
}

/**
 * @param {string} filename
 * @param {Buffer} buffer
 * @returns {Promise<{ ok: true, filename: string, relativeUrl: string, absoluteUrl: string, fullPath: string } | { ok: false, error: string }>}
 */
export async function saveReportPdf(filename, buffer) {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fullPath = path.join(REPORTS_DIR, safe);
    await fs.writeFile(fullPath, buffer);
    return {
      ok: true,
      filename: safe,
      relativeUrl: reportPublicPath(safe),
      absoluteUrl: reportAbsoluteUrl(safe),
      fullPath,
    };
  } catch (e) {
    console.error('[AEGIS-REPORT] saveReportPdf failed:', e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
