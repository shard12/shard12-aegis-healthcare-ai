import { getDb, saveDb } from '../database/db.js';
import { config } from '../config/index.js';
import { sendTelegramHtmlMessage } from './telegramService.js';
import { escapeHtml } from '../utils/htmlEscape.js';

const sentKeys = new Map();

function slotKey(medId, dateStr, hhmm) {
  return `${medId}:${dateStr}:${hhmm}`;
}

function currentHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function sendMedicineReminder(med, user) {
  const chatId = user?.settings?.telegramChatId || config.telegram.chatId;
  if (!config.telegram.token || !chatId) {
    return { ok: false, status: 'skipped', error: 'Telegram not configured — set TELEGRAM_BOT_TOKEN and chat ID in Settings' };
  }
  const time = med.reminderTime || med.time || '';
  const html = [
    '<b>💊 AEGIS Medicine Reminder</b>',
    '',
    `<b>Medicine:</b> ${escapeHtml(med.name || 'Medication')}`,
    med.dose ? `<b>Dose:</b> ${escapeHtml(med.dose)}` : '',
    time ? `<b>Scheduled:</b> ${escapeHtml(time)}` : '',
    '',
    '<i>Take as prescribed. This is a reminder only — not medical advice.</i>',
  ]
    .filter(Boolean)
    .join('\n');

  return sendTelegramHtmlMessage(html, chatId);
}

export async function tickMedicineReminders() {
  const db = getDb();
  const hhmm = currentHHMM();
  const dateStr = todayStr();
  let sent = 0;

  for (const med of db.medicineReminders || []) {
    if (!med.active) continue;
    if (med.telegram === false) continue;
    const reminderTime = String(med.reminderTime || med.time || '').slice(0, 5);
    if (!reminderTime || reminderTime !== hhmm) continue;

    const key = slotKey(med.id, dateStr, hhmm);
    if (sentKeys.has(key)) continue;

    const user = db.users.find((u) => u.id === med.userId);
    if (!user) continue;

    const result = await sendMedicineReminder(med, user);
    sentKeys.set(key, Date.now());
    if (result.ok) sent += 1;

    med.lastNotifiedAt = new Date().toISOString();
    med.lastNotifyStatus = result.status;
  }

  if (sent > 0) saveDb(db);
  return sent;
}

let intervalHandle = null;

export function startMedicineReminderScheduler() {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    tickMedicineReminders().catch((e) => console.error('[AEGIS-MEDS] scheduler:', e?.message || e));
  }, 30_000);
  console.log('[AEGIS-MEDS] Medicine reminder scheduler active (checks every 30s)');
}
