/**
 * Fill locale JSON from en.canonical.json using translate.googleapis.com (client=gtx).
 * Run: node scripts/fill-locales-gtx.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const enPath = path.join(root, 'src/i18n/locales/en.canonical.json');
const outDir = path.join(root, 'src/i18n/locales');

/** Preserve {name}, {tg}, {em} — translate literal segments only. */
const PLACEHOLDER_KEYS = {
  kn: { 'home.welcome': 'ಮರಳಿ ಸ್ವಾಗತ, {name}', 'sos.deliveryLine': 'ಟೆಲಿಗ್ರಾಮ್: {tg} · ಇಮೇಲ್: {em}' },
  ta: { 'home.welcome': 'மீண்டும் வரவேற்கிறோம், {name}', 'sos.deliveryLine': 'டெலிகிராம்: {tg} · மின்னஞ்சல்: {em}' },
  te: { 'home.welcome': 'మళ్లీ స్వాగతం, {name}', 'sos.deliveryLine': 'టెలిగ్రామ్: {tg} · ఇమెయిల్: {em}' },
  mr: { 'home.welcome': 'परत स्वागत आहे, {name}', 'sos.deliveryLine': 'टेलिग्राम: {tg} · ईमेल: {em}' },
};

const TARGETS = ['kn', 'ta', 'te', 'mr'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function gtx(text, tl) {
  const u = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(u);
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  const out = data?.[0]?.[0]?.[0];
  if (typeof out !== 'string' || !out.trim()) throw new Error('empty');
  return out.trim();
}

async function translatePreserving(text, tl) {
  if (!text.includes('{')) return gtx(text, tl);
  const parts = text.split(/(\{[^}]+\})/g);
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (/^\{[^}]+\}$/.test(p)) out.push(p);
    else if (p.trim()) out.push(await gtx(p, tl));
    else out.push(p);
  }
  return out.join('');
}

async function buildFor(tl) {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const keys = Object.keys(en);
  const manual = PLACEHOLDER_KEYS[tl] || {};
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = en[k];
    if (manual[k]) {
      result[k] = manual[k];
      continue;
    }
    try {
      result[k] = await translatePreserving(v, tl);
    } catch {
      result[k] = v;
    }
    if ((i + 1) % 20 === 0) process.stdout.write(`${tl} ${i + 1}/${keys.length}\r`);
    await sleep(110);
  }
  const outFile = path.join(outDir, `${tl}.json`);
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\nWrote ${outFile}`);
}

async function main() {
  for (const tl of TARGETS) {
    await buildFor(tl);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
