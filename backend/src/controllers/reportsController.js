import { listVaultReports, listImageReports } from '../database/db.js';
import { getPublicReport } from '../services/reportVaultService.js';

export function listReports(req, res) {
  const vault = listVaultReports(req.user.sub).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    risk: r.risk,
    summary: r.summary,
    incidentId: r.incidentId,
    pdfUrl: r.pdfUrl,
    pdfFilename: r.pdfFilename,
    accessToken: r.accessToken,
    viewUrl: r.viewUrl,
    createdAt: r.createdAt,
  }));
  const scans = listImageReports(req.user.sub).map((r) => ({
    id: r.id,
    kind: 'SCAN',
    title: r.title || 'Image scan',
    risk: r.severity || r.analysis?.severity,
    summary: r.analysis?.possible_condition || '',
    pdfUrl: r.pdfUrl,
    createdAt: r.createdAt,
  }));
  const merged = [...vault, ...scans].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ items: merged });
}

/** Public read-only report metadata (QR landing). */
export function publicReport(req, res) {
  const row = getPublicReport(req.params.token);
  if (!row) return res.status(404).json({ error: 'Report not found or link expired' });
  res.json({ report: row });
}
