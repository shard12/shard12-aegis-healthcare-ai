import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/index.js';
import { escapeHtml } from '../utils/htmlEscape.js';

const TG = (path) => `https://api.telegram.org/bot${config.telegram.token}/${path}`;

function chatIdOrDefault(chatIdOverride) {
  return chatIdOverride || config.telegram.chatId || config.telegram.groupId;
}

async function retryOp(label, fn) {
  let last;
  for (let i = 0; i < 2; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      console.error(`[AEGIS-TG] ${label} attempt ${i + 1} failed:`, e?.message || e);
    }
  }
  throw last;
}

/** Plain text message (legacy). */
export async function sendTelegramMessage(text, chatIdOverride) {
  const token = config.telegram.token;
  const chatId = chatIdOrDefault(chatIdOverride);
  if (!token || !chatId) {
    return { ok: false, status: 'skipped', error: 'Telegram not configured' };
  }
  try {
    await retryOp('sendMessage', () =>
      axios.post(
        TG('sendMessage'),
        { chat_id: chatId, text, disable_web_page_preview: false },
        { timeout: 20_000 }
      )
    );
    return { ok: true, status: 'sent' };
  } catch (e) {
    return { ok: false, status: 'failed', error: e?.response?.data?.description || e.message };
  }
}

/**
 * Rich HTML dispatch (Telegram Bot API parse_mode HTML).
 * Uses hospital-style sections, emoji headers, bold labels, and safe escaping for dynamic text.
 */
export function formatTriageDispatchHtml(ctx) {
  const {
    incidentId,
    timeLabel,
    user,
    profile,
    envelope,
    message,
    lat,
    lng,
    accuracyM,
    mapsUrl,
    hospitals,
    trackingEnabled,
  } = ctx;

  const e = escapeHtml;
  const risk = e(String(envelope?.risk_level || 'MEDIUM').toUpperCase());
  const summary = e(String(envelope?.medical_summary || '—'));
  const hLines = (hospitals || [])
    .slice(0, 8)
    .map((h) => {
      const km = typeof h.distanceKm === 'number' ? `${h.distanceKm.toFixed(1)} km` : '';
      return `• <b>${e(h.name)}</b> — ${e(km)}`;
    })
    .join('\n');

  return [
    '🚨 <b>AEGIS AI EMERGENCY DISPATCH</b>',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '🆔 <b>INCIDENT ID</b>',
    `<code>${e(incidentId)}</code>`,
    '',
    '⏰ <b>TIME</b>',
    e(timeLabel || new Date().toISOString()),
    '',
    '👤 <b>PATIENT</b>',
    e(user?.name || 'Operator'),
    `<a href="mailto:${e(user?.email || '')}">${e(user?.email || '—')}</a>`,
    '',
    '🩸 <b>BLOOD GROUP</b>',
    e(profile?.bloodGroup || '—'),
    '',
    '⚠️ <b>ALLERGIES</b>',
    e((profile?.allergies || []).join(', ') || 'None reported'),
    '',
    '💊 <b>MEDICATIONS</b>',
    e((profile?.medications || []).join(', ') || 'None reported'),
    '',
    '🩺 <b>CONDITIONS</b>',
    e((profile?.conditions || []).join(', ') || 'None reported'),
    '',
    '📝 <b>NOTES</b>',
    e(profile?.notes || '—'),
    '',
    '━━━━━━━━━━━━━━━━━━',
    '🚑 <b>EMERGENCY STATUS</b>',
    `<b>${risk}</b> PRIORITY`,
    '',
    '📍 <b>LIVE LOCATION</b>',
    lat != null && lng != null ? e(`${lat},${lng}`) : 'Not captured',
    '',
    '🎯 <b>ACCURACY</b>',
    accuracyM != null ? e(`~${Math.round(accuracyM)} meters`) : '—',
    '',
    '🗺 <b>GOOGLE MAPS</b>',
    mapsUrl ? `<a href="${e(mapsUrl)}">Open live map</a>` : '—',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '🤖 <b>AI TRIAGE SUMMARY</b>',
    e(String(message || '').slice(0, 400)),
    '',
    summary,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '🏥 <b>NEARBY HOSPITALS</b>',
    hLines || '• (none resolved — check map link)',
    '',
    '━━━━━━━━━━━━━━━━━━',
    trackingEnabled ? '🔴 <b>LIVE TRACKING ENABLED</b>' : '📌 <b>LOCATION SNAPSHOT</b>',
    '',
    '🛡 <i>Powered by AEGIS AI</i>',
  ].join('\n');
}

/** Send HTML message (rich dispatch). */
export async function sendTelegramHtmlMessage(html, chatIdOverride) {
  const token = config.telegram.token;
  const chatId = chatIdOrDefault(chatIdOverride);
  if (!token || !chatId) {
    return { ok: false, status: 'skipped', error: 'Telegram not configured' };
  }
  try {
    await retryOp('sendMessage_html', () =>
      axios.post(
        TG('sendMessage'),
        { chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: false },
        { timeout: 25_000 }
      )
    );
    return { ok: true, status: 'sent' };
  } catch (e) {
    return { ok: false, status: 'failed', error: e?.response?.data?.description || e.message };
  }
}

/** Send PDF as document with HTML caption. */
export async function sendTelegramDocument({ chatIdOverride, buffer, filename, captionHtml }) {
  const token = config.telegram.token;
  const chatId = chatIdOrDefault(chatIdOverride);
  if (!token || !chatId || !buffer?.length) {
    return { ok: false, status: 'skipped', error: 'Telegram or PDF missing' };
  }
  try {
    await retryOp('sendDocument', async () => {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('parse_mode', 'HTML');
      form.append('caption', captionHtml || 'AEGIS report');
      form.append('document', buffer, { filename: filename || 'aegis-report.pdf', contentType: 'application/pdf' });
      await axios.post(TG('sendDocument'), form, {
        headers: form.getHeaders(),
        timeout: 90_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
    });
    return { ok: true, status: 'sent' };
  } catch (e) {
    return { ok: false, status: 'failed', error: e?.response?.data?.description || e.message };
  }
}

export async function sendTelegramLocation({ chatIdOverride, lat, lng }) {
  const token = config.telegram.token;
  const chatId = chatIdOrDefault(chatIdOverride);
  if (!token || !chatId || lat == null || lng == null) {
    return { ok: false, status: 'skipped', error: 'Telegram or GPS missing' };
  }
  try {
    await retryOp('sendLocation', () =>
      axios.post(TG('sendLocation'), { chat_id: chatId, latitude: lat, longitude: lng }, { timeout: 20_000 })
    );
    return { ok: true, status: 'sent' };
  } catch (e) {
    return { ok: false, status: 'failed', error: e?.response?.data?.description || e.message };
  }
}

export function formatSosDispatchHtml(ctx) {
  const e = escapeHtml;
  const { incidentId, timeLabel, user, profile, lat, lng, accuracyM, mapsUrl, risk, notes, hospitals, tracking } = ctx;
  const hLines = (hospitals || [])
    .slice(0, 8)
    .map((h) => {
      const km = typeof h.distanceKm === 'number' ? `${h.distanceKm.toFixed(1)} km` : '';
      return `• <b>${e(h.name)}</b> — ${e(km)}`;
    })
    .join('\n');
  return [
    '🔴 <b>AEGIS AI — SOS EMERGENCY</b>',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '🆔 <b>INCIDENT ID</b>',
    `<code>${e(incidentId)}</code>`,
    '',
    '⏰ <b>TIME</b>',
    e(timeLabel || new Date().toISOString()),
    '',
    '👤 <b>OPERATOR</b>',
    e(user?.name || '—'),
    `<a href="mailto:${e(user?.email || '')}">${e(user?.email || '')}</a>`,
    '',
    '🩸 <b>BLOOD</b> ' + e(profile?.bloodGroup || '—'),
    '⚠️ <b>ALLERGIES</b> ' + e((profile?.allergies || []).join(', ') || 'None'),
    '💊 <b>MEDS</b> ' + e((profile?.medications || []).join(', ') || 'None'),
    '',
    '📝 <b>OPERATOR NOTE</b>',
    e(notes || '—'),
    '',
    '🚑 <b>RISK CONTEXT</b>',
    e(risk || 'SOS'),
    '',
    '📍 <b>GPS</b>',
    lat != null && lng != null ? e(`${lat},${lng}`) : '—',
    '🎯 <b>ACCURACY</b> ' + (accuracyM != null ? e(`~${Math.round(accuracyM)} m`) : '—'),
    mapsUrl ? `🗺 <a href="${e(mapsUrl)}">Google Maps</a>` : '',
    '',
    '🏥 <b>NEARBY HOSPITALS</b>',
    hLines || '• (none resolved)',
    '',
    tracking ? '🔴 <b>LIVE TRACKING</b>' : '📌 <b>SNAPSHOT</b>',
    '',
    '🛡 <i>Powered by AEGIS AI</i>',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Full bundle: rich HTML message + PDF document + map pin (best-effort; failures are non-fatal).
 */
export async function sendTelegramEmergencyBundle({
  chatIdOverride,
  html,
  pdfBuffer,
  pdfFilename,
  lat,
  lng,
  extraChatIds = [],
}) {
  const primary = chatIdOrDefault(chatIdOverride);
  const targets = [...new Set([primary, ...extraChatIds].filter(Boolean))];

  const results = [];
  for (const chatId of targets) {
    const msg = await sendTelegramHtmlMessage(html, chatId);
    let doc = { ok: false, status: 'skipped' };
    if (pdfBuffer?.length) {
      doc = await sendTelegramDocument({
        chatIdOverride: chatId,
        buffer: pdfBuffer,
        filename: pdfFilename,
        captionHtml: '<b>📎 AEGIS PDF Report</b> — open attachment for full clinical layout.',
      });
    }
    const loc = await sendTelegramLocation({ chatIdOverride: chatId, lat, lng });
    results.push({ chatId, message: msg, document: doc, location: loc });
  }

  const anyMsgOk = results.some((r) => r.message.ok);
  const anyDocOk = results.some((r) => r.document.ok);
  return {
    ok: anyMsgOk || anyDocOk,
    results,
    status: anyMsgOk ? 'sent' : 'failed',
  };
}
