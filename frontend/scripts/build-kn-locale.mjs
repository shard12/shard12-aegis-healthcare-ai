/**
 * Build kn.json from en.canonical.json via MyMemory (en|kn).
 * Falls back to English on quota/errors. Run: node scripts/build-kn-locale.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const enPath = path.join(root, 'src/i18n/locales/en.canonical.json');
const outPath = path.join(root, 'src/i18n/locales/kn.json');

const MANUAL = {
  'home.welcome': 'ಮರಳಿ ಸ್ವಾಗತ, {name}',
  'sos.deliveryLine': 'ಟೆಲಿಗ್ರಾಮ್: {tg} · ಇಮೇಲ್: {em}',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateOne(text) {
  const u = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|kn`;
  const res = await fetch(u);
  const j = await res.json();
  if (j.responseStatus !== 200) throw new Error(String(j.responseDetails || 'fail'));
  const out = String(j.responseData?.translatedText ?? text);
  if (/MYMEMORY WARNING|VISIT HTTPS:\/\/MYMEMORY/i.test(out)) throw new Error('quota');
  return out;
}

async function translatePreserving(text) {
  if (!text.includes('{')) return translateOne(text);
  const parts = text.split(/(\{[^}]+\})/g);
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (/^\{[^}]+\}$/.test(p)) out.push(p);
    else if (p.trim()) out.push(await translateOne(p));
    else out.push(p);
  }
  return out.join('');
}

async function main() {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const keys = Object.keys(en);
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = en[k];
    if (MANUAL[k]) {
      result[k] = MANUAL[k];
      continue;
    }
    try {
      result[k] = await translatePreserving(v);
      process.stdout.write(`${i + 1}/${keys.length}\r`);
    } catch {
      result[k] = v;
    }
    await sleep(320);
  }
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log('\nWrote', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
