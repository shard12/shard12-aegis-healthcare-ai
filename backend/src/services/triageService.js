/**
 * Post-triage emergency reporting: PDF → disk → Telegram + Email + metadata for history.
 * Failures are isolated per step so Express handlers always return a triage envelope to the client.
 */

import crypto from 'crypto';
import { config } from '../config/index.js';
import { fetchHospitalsNearby } from './osmService.js';
import { registerVaultReport, createReportAccessToken, buildReportViewUrl } from './reportVaultService.js';
import { buildTriageReportPdfBuffer, buildSosEmergencyPdfBuffer } from './pdfService.js';
import { saveReportPdf, makeReportFilename } from './reportService.js';
import { sendMail, buildEmergencyEmailHtml } from './emailService.js';
import { formatTriageDispatchHtml, sendTelegramEmergencyBundle, formatSosDispatchHtml } from './telegramService.js';

export function buildIncidentId() {
  const y = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `AEG-${y}-${n}`;
}

/**
 * @param {import('express').Request} req
 * @param {object} ctx
 */
export async function completeTriageDispatch(req, ctx) {
  const {
    user,
    envelope,
    message,
    lat,
    lng,
    accuracy,
    emergencyFlag,
  } = ctx;

  const incidentId = buildIncidentId();
  const reportId = crypto.randomUUID();
  const timeLabel = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const profile = user.profile || {};
  const mapsUrl = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : '';
  const host = `${req.protocol}://${req.get('host')}`;
  const accessToken = createReportAccessToken();
  const trackingUrl = buildReportViewUrl(accessToken);

  let hospitals = [];
  try {
    if (lat != null && lng != null) {
      hospitals = await fetchHospitalsNearby(Number(lat), Number(lng));
    }
  } catch (e) {
    console.error('[AEGIS-TRIAGE] hospital lookup failed:', e?.message || e);
  }

  const pdfPayload = {
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
    symptoms: message,
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
    gps: lat != null && lng != null ? `${lat},${lng}` : '',
    maps: mapsUrl,
    accuracyM: accuracy,
    hospitals,
    trackingUrl,
  };

  let pdfBuffer = null;
  let saved = { ok: false };
  try {
    pdfBuffer = await buildTriageReportPdfBuffer(pdfPayload);
    const fn = makeReportFilename('TRIAGE');
    saved = await saveReportPdf(fn, pdfBuffer);
  } catch (e) {
    console.error('[AEGIS-TRIAGE] PDF build/save failed:', e?.message || e);
  }

  const pdfUrlForEmail = saved.ok ? saved.absoluteUrl : '';
  const pdfPathRelative = saved.ok ? saved.relativeUrl : '';

  const tgChat = user.settings?.telegramChatId || config.telegram.chatId;
  const tgGroup = user.settings?.telegramGroupId || config.telegram.groupId;
  const mailTo = user.settings?.alertEmail || user.email;

  const html = formatTriageDispatchHtml({
    incidentId,
    timeLabel,
    user,
    profile,
    envelope,
    message,
    lat,
    lng,
    accuracyM: accuracy,
    mapsUrl,
    hospitals,
    trackingEnabled: Boolean(ctx.tracking),
  });

  const extras = [];
  if (tgGroup && tgGroup !== tgChat) extras.push(tgGroup);

  let tgBundle = { ok: false, status: 'skipped', results: [] };
  try {
    tgBundle = await sendTelegramEmergencyBundle({
      chatIdOverride: tgChat,
      extraChatIds: extras,
      html,
      pdfBuffer: saved.ok ? pdfBuffer : null,
      pdfFilename: saved.filename || 'aegis-triage.pdf',
      lat,
      lng,
    });
  } catch (e) {
    console.error('[AEGIS-TRIAGE] telegram bundle error:', e?.message || e);
    tgBundle = { ok: false, status: 'failed', error: e.message, results: [] };
  }

  const emailHtml = buildEmergencyEmailHtml({
    incidentId,
    timeLabel,
    user,
    profile,
    envelope,
    message,
    mapsUrl,
    pdfUrl: pdfUrlForEmail || pdfPathRelative || '',
    hospitals,
    trackingUrl,
    emergency: Boolean(emergencyFlag || envelope.emergency_triggered),
  });

  let em = { ok: false, status: 'skipped' };
  try {
    em = await sendMail({
      to: mailTo,
      subject: `AEGIS AI — Triage report ${incidentId} [${String(envelope.risk_level || '').toUpperCase()}]`,
      html: emailHtml,
      text: `AEGIS triage ${incidentId}. Open email HTML client for full report. Map: ${mapsUrl}`,
      attachments: saved.ok && pdfBuffer?.length ? [{ filename: saved.filename, content: pdfBuffer }] : [],
    });
  } catch (e) {
    console.error('[AEGIS-TRIAGE] email error:', e?.message || e);
    em = { ok: false, status: 'failed', error: e.message };
  }

  const telegramStatus = tgBundle.ok ? 'sent' : tgBundle.status === 'skipped' ? 'skipped' : 'failed';
  const emailStatus = em.ok ? 'sent' : em.status === 'skipped' ? 'skipped' : 'failed';

  const pdfPublicUrl = saved.ok ? pdfPathRelative || saved.relativeUrl : null;
  let vaultRow = null;
  if (saved.ok) {
    try {
      vaultRow = registerVaultReport({
        userId: user.id,
        kind: 'TRIAGE',
        incidentId,
        title: envelope.intent || 'AI Triage',
        risk: envelope.risk_level,
        summary: envelope.medical_summary,
        pdfUrl: pdfPublicUrl,
        pdfFilename: saved.filename,
        envelope,
        accessToken,
      });
    } catch (e) {
      console.error('[AEGIS-TRIAGE] vault register failed:', e?.message || e);
    }
  }

  return {
    incidentId,
    reportId,
    reportPdfUrl: saved.ok ? pdfPublicUrl : null,
    reportPdfRelativeUrl: saved.ok ? pdfPathRelative : null,
    reportFilename: saved.filename || null,
    reportAccessToken: accessToken,
    reportViewUrl: vaultRow?.viewUrl || trackingUrl,
    telegramStatus,
    emailStatus,
    telegramDetail: tgBundle,
    emailDetail: em,
    hospitals,
    pdfError: saved.ok ? null : saved.error || 'PDF could not be saved',
  };
}

/**
 * SOS dispatch: PDF + rich Telegram + HTML email (mirrors triage pipeline).
 */
export async function completeSosDispatch(req, ctx) {
  const { user, lat, lng, accuracy, risk, notes, tracking } = ctx;
  const incidentId = buildIncidentId();
  const reportId = crypto.randomUUID();
  const timeLabel = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const profile = user.profile || {};
  const mapsUrl = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : '';
  const accessToken = createReportAccessToken();
  const trackingUrl = buildReportViewUrl(accessToken);

  let hospitals = [];
  try {
    if (lat != null && lng != null) {
      hospitals = await fetchHospitalsNearby(Number(lat), Number(lng));
    }
  } catch (e) {
    console.error('[AEGIS-SOS] hospital lookup failed:', e?.message || e);
  }

  let pdfBuffer = null;
  let saved = { ok: false };
  try {
    pdfBuffer = await buildSosEmergencyPdfBuffer({
      incidentId,
      reportId,
      timestamp: new Date().toISOString(),
      patient: {
        name: user.name,
        email: user.email,
        bloodGroup: profile.bloodGroup,
        allergies: profile.allergies,
        medications: profile.medications,
        conditions: profile.conditions,
        notes: profile.notes,
      },
      notes,
      summary: notes,
      risk: risk || 'SOS',
      location: { gps: lat != null ? `${lat},${lng}` : '', mapsUrl, accuracyM: accuracy },
      hospitals,
      trackingUrl,
      recommendedAction: 'Dispatch assistance — verify operator status immediately.',
    });
    const fn = makeReportFilename('SOS');
    saved = await saveReportPdf(fn, pdfBuffer);
  } catch (e) {
    console.error('[AEGIS-SOS] PDF failed:', e?.message || e);
  }

  const pdfUrlForEmail = saved.ok ? saved.absoluteUrl : '';
  const pdfPathRelative = saved.ok ? saved.relativeUrl : '';

  const html = formatSosDispatchHtml({
    incidentId,
    timeLabel,
    user,
    profile,
    lat,
    lng,
    accuracyM: accuracy,
    mapsUrl,
    risk,
    notes,
    hospitals,
    tracking,
  });

  const tgChat = user.settings?.telegramChatId || config.telegram.chatId;
  const tgGroup = user.settings?.telegramGroupId || config.telegram.groupId;
  const mailTo = user.settings?.alertEmail || user.email;
  const extras = [];
  if (tgGroup && tgGroup !== tgChat) extras.push(tgGroup);

  let tgBundle = { ok: false, status: 'skipped' };
  try {
    tgBundle = await sendTelegramEmergencyBundle({
      chatIdOverride: tgChat,
      extraChatIds: extras,
      html,
      pdfBuffer: saved.ok ? pdfBuffer : null,
      pdfFilename: saved.filename || 'aegis-sos.pdf',
      lat,
      lng,
    });
  } catch (e) {
    console.error('[AEGIS-SOS] telegram error:', e?.message || e);
  }

  const fakeEnvelope = {
    risk_level: risk || 'HIGH',
    medical_summary: notes || 'SOS triggered by operator.',
  };
  const emailHtml = buildEmergencyEmailHtml({
    incidentId,
    timeLabel,
    user,
    profile,
    envelope: fakeEnvelope,
    message: notes || 'SOS dispatch',
    mapsUrl,
    pdfUrl: pdfUrlForEmail || pdfPathRelative || '',
    hospitals,
    trackingUrl,
    emergency: true,
  });

  let em = { ok: false, status: 'skipped' };
  try {
    em = await sendMail({
      to: mailTo,
      subject: `AEGIS SOS — ${incidentId}`,
      html: emailHtml,
      text: `SOS ${incidentId} ${mapsUrl}`,
      attachments: saved.ok && pdfBuffer?.length ? [{ filename: saved.filename, content: pdfBuffer }] : [],
    });
  } catch (e) {
    console.error('[AEGIS-SOS] email error:', e?.message || e);
  }

  const pdfPublicUrl = saved.ok ? pdfPathRelative : null;
  if (saved.ok) {
    try {
      registerVaultReport({
        userId: user.id,
        kind: 'SOS',
        incidentId,
        title: 'SOS Dispatch',
        risk: risk || 'HIGH',
        summary: notes || 'SOS triggered',
        pdfUrl: pdfPublicUrl,
        pdfFilename: saved.filename,
        accessToken,
      });
    } catch (e) {
      console.error('[AEGIS-SOS] vault register failed:', e?.message || e);
    }
  }

  return {
    incidentId,
    reportPdfUrl: saved.ok ? pdfPublicUrl : null,
    reportFilename: saved.filename || null,
    reportAccessToken: accessToken,
    reportViewUrl: buildReportViewUrl(accessToken),
    telegramStatus: tgBundle.ok ? 'sent' : tgBundle.status === 'skipped' ? 'skipped' : 'failed',
    emailStatus: em.ok ? 'sent' : em.status === 'skipped' ? 'skipped' : 'failed',
    hospitals,
    pdfError: saved.ok ? null : saved.error || 'PDF could not be saved',
  };
}
