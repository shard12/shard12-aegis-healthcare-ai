import crypto from 'crypto';
import { config } from '../config/index.js';
import { addVaultReport, findVaultReportByToken } from '../database/db.js';

export function createReportAccessToken() {
  return crypto.randomBytes(16).toString('hex');
}

export function buildReportViewUrl(accessToken) {
  const base = String(config.frontendUrl || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/reports/view/${accessToken}`;
}

/**
 * Register a saved PDF for QR access and the reports library.
 */
export function registerVaultReport({
  userId,
  kind,
  incidentId,
  title,
  risk,
  summary,
  pdfUrl,
  pdfFilename,
  envelope,
  accessToken,
}) {
  const token = accessToken || createReportAccessToken();
  const row = addVaultReport(userId, {
    kind: kind || 'TRIAGE',
    incidentId: incidentId || '',
    title: title || 'AEGIS Report',
    risk: risk || '',
    summary: summary || '',
    pdfUrl: pdfUrl || '',
    pdfFilename: pdfFilename || '',
    accessToken: token,
    viewUrl: buildReportViewUrl(token),
    envelope: envelope || null,
  });
  return row;
}

export function getPublicReport(accessToken) {
  const row = findVaultReportByToken(accessToken);
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    incidentId: row.incidentId,
    title: row.title,
    risk: row.risk,
    summary: row.summary,
    pdfUrl: row.pdfUrl,
    pdfFilename: row.pdfFilename,
    createdAt: row.createdAt,
    viewUrl: row.viewUrl,
    patientName: row.patientName || '',
  };
}
