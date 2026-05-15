import { addMedicine, listMedicines, updateMedicine, findUserById } from '../database/db.js';
import { sendMedicineReminder } from '../services/medicineReminderService.js';
import { config } from '../config/index.js';

export function medicines(req, res) {
  res.json({ items: listMedicines(req.user.sub), telegramConfigured: Boolean(config.telegram.token) });
}

export function createMedicine(req, res) {
  const body = req.body || {};
  const row = addMedicine(req.user.sub, {
    name: body.name,
    dose: body.dose || '',
    reminderTime: body.reminderTime || body.time || '09:00',
    telegram: body.telegram !== false,
    active: body.active !== false,
  });
  res.json({ item: row });
}

export function patchMedicine(req, res) {
  const row = updateMedicine(req.user.sub, req.params.id, req.body || {});
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ item: row });
}

/** Send a test Telegram reminder immediately. */
export async function notifyMedicineNow(req, res) {
  try {
    const user = findUserById(req.user.sub);
    const meds = listMedicines(req.user.sub);
    const med = meds.find((m) => m.id === req.params.id);
    if (!med) return res.status(404).json({ error: 'Medicine not found' });
    const result = await sendMedicineReminder(med, user);
    updateMedicine(req.user.sub, med.id, {
      lastNotifiedAt: new Date().toISOString(),
      lastNotifyStatus: result.status,
    });
    res.json({ ok: result.ok, status: result.status, error: result.error || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
