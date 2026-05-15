import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'aegis-db.json');

const defaultDb = {
  users: [],
  histories: [],
  reports: [],
  vaultReports: [],
  smsAlerts: [],
  medicineReminders: [],
  chatThreads: [],
  sosLogs: [],
};

function readDb() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), 'utf8');
      return structuredClone(defaultDb);
    }
    const raw = fs.readFileSync(dbPath, 'utf8');
    return { ...defaultDb, ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultDb);
  }
}

function writeDb(db) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

export function getDb() {
  return readDb();
}

export function saveDb(db) {
  writeDb(db);
}

export function createUser(payload) {
  const db = getDb();
  const user = {
    id: uuid(),
    email: payload.email.toLowerCase(),
    passwordHash: payload.passwordHash,
    name: payload.name || 'Operator',
    avatarUrl: payload.avatarUrl || '',
    googleId: payload.googleId || '',
    profile: {
      gender: '',
      bloodGroup: 'O+',
      dob: '',
      heightCm: '',
      weightKg: '',
      allergies: [],
      medications: [],
      conditions: [],
      emergencyContacts: [],
      insuranceProvider: '',
      insuranceId: '',
      medicalHistory: '',
      notes: '',
    },
    settings: {
      language: 'en',
      darkMode: true,
      largeText: false,
      vibrations: true,
      telegramChatId: '',
      telegramGroupId: '',
      alertEmail: payload.email.toLowerCase(),
      alertPhone: '',
    },
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb(db);
  return user;
}

export function findUserByEmail(email) {
  const db = getDb();
  return db.users.find((u) => u.email === email.toLowerCase());
}

export function findUserById(id) {
  const db = getDb();
  return db.users.find((u) => u.id === id);
}

export function findUserByGoogleId(googleId) {
  const db = getDb();
  return db.users.find((u) => u.googleId === googleId);
}

export function updateUser(id, patch) {
  const db = getDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const cur = db.users[idx];
  db.users[idx] = {
    ...cur,
    ...patch,
    profile: { ...cur.profile, ...(patch.profile || {}) },
    settings: { ...cur.settings, ...(patch.settings || {}) },
  };
  saveDb(db);
  return db.users[idx];
}

export function addHistoryEntry(userId, entry) {
  const db = getDb();
  const row = { id: uuid(), userId, createdAt: new Date().toISOString(), ...entry };
  db.histories.unshift(row);
  saveDb(db);
  return row;
}

export function listHistory(userId) {
  return getDb().histories.filter((h) => h.userId === userId);
}

export function patchHistoryEntry(userId, historyId, patch) {
  const db = getDb();
  const idx = db.histories.findIndex((h) => h.id === historyId && h.userId === userId);
  if (idx === -1) return null;
  db.histories[idx] = { ...db.histories[idx], ...patch };
  saveDb(db);
  return db.histories[idx];
}

export function addMedicine(userId, med) {
  const db = getDb();
  const row = { id: uuid(), userId, createdAt: new Date().toISOString(), ...med };
  db.medicineReminders.push(row);
  saveDb(db);
  return row;
}

export function updateMedicine(userId, id, patch) {
  const db = getDb();
  const idx = db.medicineReminders.findIndex((m) => m.id === id && m.userId === userId);
  if (idx === -1) return null;
  db.medicineReminders[idx] = { ...db.medicineReminders[idx], ...patch };
  saveDb(db);
  return db.medicineReminders[idx];
}

export function listMedicines(userId) {
  return getDb().medicineReminders.filter((m) => m.userId === userId);
}

export function appendChat(userId, role, content, meta = {}) {
  const db = getDb();
  const row = { id: uuid(), userId, role, content, meta, createdAt: new Date().toISOString() };
  db.chatThreads.push(row);
  if (db.chatThreads.length > 500) db.chatThreads.splice(0, db.chatThreads.length - 500);
  saveDb(db);
  return row;
}

export function recentChats(userId, limit = 30) {
  return getDb()
    .chatThreads.filter((c) => c.userId === userId)
    .slice(-limit);
}

export function addSosLog(userId, log) {
  const db = getDb();
  const row = { id: uuid(), userId, createdAt: new Date().toISOString(), ...log };
  db.sosLogs.unshift(row);
  saveDb(db);
  return row;
}

export function listSosLogs(userId) {
  return getDb().sosLogs.filter((s) => s.userId === userId);
}

/** Medical image scan reports (image + AI analysis + severity). */
export function addImageReport(userId, entry) {
  const db = getDb();
  if (!Array.isArray(db.reports)) db.reports = [];
  const row = {
    id: uuid(),
    userId,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  db.reports.unshift(row);
  saveDb(db);
  return row;
}

export function listImageReports(userId) {
  const db = getDb();
  return (db.reports || []).filter((r) => r.userId === userId);
}

export function findImageReport(userId, reportId) {
  return listImageReports(userId).find((r) => r.id === reportId) || null;
}

/** Triage / SOS PDF vault — QR-accessible reports. */
export function addVaultReport(userId, entry) {
  const db = getDb();
  if (!Array.isArray(db.vaultReports)) db.vaultReports = [];
  const row = {
    id: uuid(),
    userId,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  db.vaultReports.unshift(row);
  if (db.vaultReports.length > 500) db.vaultReports.length = 500;
  saveDb(db);
  return row;
}

export function listVaultReports(userId) {
  const db = getDb();
  return (db.vaultReports || []).filter((r) => r.userId === userId);
}

export function findVaultReportByToken(accessToken) {
  const db = getDb();
  return (db.vaultReports || []).find((r) => r.accessToken === accessToken) || null;
}

export function addSmsAlert(userId, entry) {
  const db = getDb();
  if (!Array.isArray(db.smsAlerts)) db.smsAlerts = [];
  const row = {
    id: uuid(),
    userId,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  db.smsAlerts.unshift(row);
  if (db.smsAlerts.length > 200) db.smsAlerts.length = 200;
  saveDb(db);
  return row;
}

export function listSmsAlerts(userId, limit = 50) {
  const db = getDb();
  return (db.smsAlerts || []).filter((a) => a.userId === userId).slice(0, limit);
}
