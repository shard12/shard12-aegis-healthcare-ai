import crypto from 'crypto';
import { buildIncidentPdfBuffer, buildTriageReportPdfBuffer } from '../services/pdfService.js';
import { findUserById, listHistory, listSosLogs } from '../database/db.js';
import { fetchHospitalsNearby } from '../services/osmService.js';
import { createReportAccessToken, buildReportViewUrl, registerVaultReport } from '../services/reportVaultService.js';

export async function incidentPdf(req, res) {
  try {
    const user = findUserById(req.user.sub);
    const { historyId, symptoms, envelope, lat, lng } = req.body || {};
    const histories = listHistory(user.id);
    const h = histories.find((x) => x.id === historyId) || histories[0];
    const sos = listSosLogs(user.id)[0];
    let hospitals = [];
    if (lat && lng) {
      hospitals = await fetchHospitalsNearby(Number(lat), Number(lng));
    }
    const profile = user.profile || {};
    const host = `${req.protocol}://${req.get('host')}`;
    const incidentId = h?.incidentId || crypto.randomUUID().slice(0, 8).toUpperCase();
    const buf = await buildIncidentPdfBuffer({
      incidentId,
      reportId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      name: user.name,
      email: user.email,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      medications: profile.medications,
      conditions: profile.conditions,
      notes: profile.notes,
      symptoms: symptoms || h?.summary || '',
      risk: envelope?.risk_level || h?.risk,
      confidence: envelope?.confidence_score,
      whyRisk: envelope?.why_this_risk,
      summary: envelope?.medical_summary || h?.summary,
      action: envelope?.recommended_action,
      gps: lat && lng ? `${lat},${lng}` : '',
      maps: lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '',
      hospitals,
      telegramStatus: h?.telegramStatus || sos?.telegramStatus,
      emailStatus: h?.emailStatus || sos?.emailStatus,
      trackingUrl: `${host}/history`,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="aegis-report.pdf"');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function triageReportPdf(req, res) {
  try {
    const user = findUserById(req.user.sub);
    const { historyId, symptoms, envelope, lat, lng } = req.body || {};
    if (!envelope || typeof envelope !== 'object') return res.status(400).json({ error: 'envelope required' });
    const histories = listHistory(user.id);
    const h = histories.find((x) => x.id === historyId) || null;
    const profile = user.profile || {};
    const reportId = crypto.randomUUID();
    const accessToken = createReportAccessToken();
    const incidentId = h?.incidentId || `AEG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let hospitals = [];
    if (lat && lng) {
      hospitals = await fetchHospitalsNearby(Number(lat), Number(lng));
    }
    const buf = await buildTriageReportPdfBuffer({
      incidentId,
      reportId,
      timestamp: new Date().toISOString(),
      name: user.name,
      email: user.email,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      medications: profile.medications,
      conditions: profile.conditions,
      notes: profile.notes,
      symptoms: symptoms || h?.summary || '',
      intent: envelope.intent,
      risk: envelope.risk_level,
      severity: envelope.severity || envelope.risk_level,
      confidence: envelope.confidence_score,
      category: envelope.emergency_category || envelope.intent,
      probableConditions: envelope.probable_conditions || envelope.possible_concerns,
      recommendations: envelope.recommendations,
      immediateActions: envelope.immediate_actions,
      escalationAdvice: envelope.escalation_advice,
      whyRisk: envelope.why_this_risk,
      summary: envelope.medical_summary,
      firstAid: envelope.suggested_response,
      action: envelope.recommended_action,
      concerns: envelope.possible_concerns,
      emergencyTriggered: Boolean(envelope.emergency_triggered),
      gps: lat && lng ? `${lat},${lng}` : '',
      maps: lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '',
      telegramStatus: h?.telegramStatus,
      emailStatus: h?.emailStatus,
      hospitals,
      trackingUrl: buildReportViewUrl(accessToken),
    });
    registerVaultReport({
      userId: user.id,
      kind: 'TRIAGE',
      incidentId,
      title: envelope.intent || 'Triage PDF',
      risk: envelope.risk_level,
      summary: envelope.medical_summary,
      pdfUrl: null,
      envelope,
      accessToken,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="aegis-clinical-triage-report.pdf"');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
