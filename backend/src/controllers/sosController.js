import { addSosLog, findUserById } from '../database/db.js';
import { completeSosDispatch } from '../services/triageService.js';

export async function dispatchSos(req, res) {
  try {
    const { lat, lng, accuracy, risk, notes, tracking } = req.body || {};
    const user = findUserById(req.user.sub);
    if (!user) return res.status(401).json({ error: 'User not found — sign in again' });

    let dispatch = {
      incidentId: null,
      reportPdfUrl: null,
      reportFilename: null,
      telegramStatus: 'skipped',
      emailStatus: 'skipped',
    };
    try {
      dispatch = await completeSosDispatch(req, { user, lat, lng, accuracy, risk, notes, tracking });
    } catch (e) {
      console.error('[AEGIS-SOS] dispatch pipeline error:', e?.message || e);
    }

    const maps = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '';
    const log = addSosLog(user.id, {
      lat,
      lng,
      accuracy,
      maps,
      incidentId: dispatch.incidentId,
      reportPdfUrl: dispatch.reportPdfUrl,
      telegramStatus: dispatch.telegramStatus,
      emailStatus: dispatch.emailStatus,
      body: `SOS ${dispatch.incidentId || ''}`,
    });

    res.json({
      ok: true,
      results: {
        telegram: { status: dispatch.telegramStatus },
        email: { status: dispatch.emailStatus },
      },
      report: {
        incidentId: dispatch.incidentId,
        url: dispatch.reportPdfUrl,
        filename: dispatch.reportFilename,
      },
      logId: log.id,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
