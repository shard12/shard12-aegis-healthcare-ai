import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config/index.js';
import { escapeHtml } from '../utils/htmlEscape.js';

let transporter;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.email.user || !config.email.pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    connectionTimeout: 14000,
    greetingTimeout: 14000,
    socketTimeout: 26000,
  });

  return transporter;
}

async function retryMail(label, fn) {
  let last;

  for (let i = 0; i < 2; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;

      console.error(
        `[AEGIS-EMAIL] ${label} attempt ${i + 1} failed:`,
        e?.message || e
      );
    }
  }

  throw last;
}

/**
 * Send email
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
  attachments = [],
}) {
  // =========================
  // RESEND (PRIMARY)
  // =========================

  if (process.env.RESEND_API_KEY && resend) {
    try {
      const result = await resend.emails.send({
        from:'AEGIS AI <onboarding@resend.dev>',

        to,
        subject,

        html:
          html ||
          `<pre>${escapeHtml(text || subject)}</pre>`,

        text: text || subject,

        attachments: (attachments || []).map((a) => ({
          filename: a.filename,

          content: Buffer.isBuffer(a.content)
            ? a.content.toString('base64')
            : a.content,
        })),
      });

      console.log(
        '[AEGIS-EMAIL] resend success:',
        result
      );

      return {
        ok: true,
        status: 'sent',
      };
    } catch (e) {
      console.error(
        '[AEGIS-EMAIL] resend failed:',
        e?.message || e
      );

      return {
        ok: false,
        status: 'failed',
        error: e?.message || 'Resend failed',
      };
    }
  }

  // =========================
  // SMTP FALLBACK
  // =========================

  const t = getTransporter();

  if (!t) {
    return {
      ok: false,
      status: 'skipped',
      error: 'Email not configured',
    };
  }

  const deadlineMs = 45000;

  try {
    await Promise.race([
      retryMail('sendMail', () =>
        t.sendMail({
          from: config.email.from,

          to,

          subject,

          text: text || subject,

          html:
            html ||
            `<pre>${escapeHtml(text || subject)}</pre>`,

          attachments: (attachments || []).map((a) => ({
            filename: a.filename,

            content: a.content,

            contentType:
              a.contentType || 'application/pdf',
          })),
        })
      ),

      new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Email send timed out after ${
                deadlineMs / 1000
              }s`
            )
          );
        }, deadlineMs);
      }),
    ]);

    return {
      ok: true,
      status: 'sent',
    };
  } catch (e) {
    return {
      ok: false,
      status: 'failed',
      error: e.message,
    };
  }
}

/**
 * Emergency email template
 */
export function buildEmergencyEmailHtml(ctx) {
  const e = escapeHtml;

  const {
    incidentId,
    timeLabel,
    user,
    profile,
    envelope,
    message,
    mapsUrl,
    pdfUrl,
    hospitals,
    trackingUrl,
    emergency,
  } = ctx;

  const risk = e(
    String(envelope?.risk_level || 'MEDIUM').toUpperCase()
  );

  const summary = e(
    String(envelope?.medical_summary || '—')
  );

  const hRows = (hospitals || [])
    .slice(0, 6)
    .map(
      (h) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#e2e8f0;font-family:system-ui,Segoe UI,sans-serif;font-size:14px;">
        ${e(h.name)}
      </td>

      <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;font-family:system-ui;font-size:13px;">
        ${
          typeof h.distanceKm === 'number'
            ? `${h.distanceKm.toFixed(1)} km`
            : '—'
        }
      </td>
    </tr>`
    )
    .join('');

  const btn = (href, label, bg) =>
    `<a href="${e(
      href
    )}" style="display:inline-block;margin:6px 8px 6px 0;padding:12px 18px;background:${bg};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-family:system-ui;font-size:13px;">${e(
      label
    )}</a>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AEGIS Emergency</title>
</head>

<body style="margin:0;background:#0b0f14;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0f14;padding:24px 12px;">
<tr>
<td align="center">

<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">

<tr>
<td style="background:linear-gradient(90deg,#7f1d1d,#b91c1c);padding:20px 24px;">

<div style="font-family:system-ui;font-size:11px;letter-spacing:0.2em;color:#fecaca;text-transform:uppercase;">
AEGIS AI
</div>

<div style="font-family:system-ui;font-size:22px;font-weight:800;color:#fff;">
Emergency dispatch
</div>

<div style="margin-top:8px;font-size:13px;color:#fecaca;">
Incident <b>${e(incidentId)}</b> • ${e(
    timeLabel || ''
  )}
</div>

</td>
</tr>

<tr>
<td style="padding:20px 22px 8px;">

<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#1e293b;color:#f97316;font-weight:800;font-family:system-ui;font-size:12px;">
SEVERITY: ${risk}
</span>

${
  emergency
    ? '<span style="margin-left:8px;color:#f87171;font-weight:700;font-family:system-ui;font-size:12px;">AUTO-ESCALATION</span>'
    : ''
}

</td>
</tr>

<tr>
<td style="padding:8px 22px 0;font-family:system-ui;font-size:14px;color:#cbd5e1;">

<div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">
Patient
</div>

<div style="margin-top:6px;color:#f1f5f9;font-weight:700;">
${e(user?.name || 'Operator')}
</div>

<div style="color:#94a3b8;">
${e(user?.email || '')}
</div>

</td>
</tr>

<tr>
<td style="padding:16px 22px;">

<div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">
Chief complaint
</div>

<div style="margin-top:6px;padding:12px;background:#0f172a;border-radius:10px;border:1px solid #1e293b;color:#e2e8f0;font-size:14px;line-height:1.5;">
${e(String(message || '').slice(0, 800))}
</div>

</td>
</tr>

<tr>
<td style="padding:8px 22px 0;">

<div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">
AI triage summary
</div>

<div style="margin-top:6px;padding:12px;background:#0f172a;border-radius:10px;border:1px solid #334155;color:#cbd5e1;font-size:14px;line-height:1.55;">
${summary}
</div>

</td>
</tr>

<tr>
<td style="padding:18px 22px;">

${mapsUrl ? btn(mapsUrl, 'Open live map', '#2563eb') : ''}
${pdfUrl ? btn(pdfUrl, 'Download PDF', '#0d9488') : ''}

</td>
</tr>

<tr>
<td style="padding:0 22px 16px;">

<div style="font-size:11px;color:#64748b;text-transform:uppercase;">
Nearby hospitals
</div>

<table role="presentation" width="100%" cellspacing="0" style="margin-top:8px;border-radius:10px;overflow:hidden;border:1px solid #1e293b;">
${
  hRows ||
  '<tr><td style="padding:12px;color:#64748b;">No list — use map link.</td></tr>'
}
</table>

</td>
</tr>

<tr>
<td style="padding:12px 22px 22px;font-size:11px;color:#64748b;font-family:system-ui;">

Tracking link:
<a href="${e(
    trackingUrl || mapsUrl || '#'
  )}" style="color:#38bdf8;">
${e(trackingUrl || mapsUrl || '')}
</a>

<br/>

PDF attached when generation succeeded.

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;
}