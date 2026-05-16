/**
 * Generates hi.json, zh.json, ja.json, kn.json from locales/en.canonical.json
 * using MyMemory public API (rate-limited). Run: node scripts/generate-ui-locales.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const enPath = path.join(root, 'src/i18n/locales/en.canonical.json');
const outDir = path.join(root, 'src/i18n/locales');

const LANGPAIR = { hi: 'en|hi', zh: 'en|zh-CN', ja: 'en|ja', kn: 'en|kn' };

/** Keys with {vars} — hand-written per target (avoid MT mangling placeholders). */
const MANUAL = {
  hi: {
    'home.welcome': 'वापसी पर स्वागत है, {name}',
    'sos.deliveryLine': 'टेलीग्राम: {tg} · ईमेल: {em}',
  },
  zh: {
    'home.welcome': '欢迎回来，{name}',
    'sos.deliveryLine': 'Telegram：{tg} · 电子邮件：{em}',
  },
  ja: {
    'home.welcome': 'おかえりなさい、{name}さん',
    'sos.deliveryLine': 'Telegram: {tg} · メール: {em}',
  },
  kn: {
    'home.welcome': 'ಮರಳಿ ಸ್ವಾಗತ, {name}',
    'sos.deliveryLine': 'ಟೆಲಿಗ್ರಾಮ್: {tg} · ಇಮೇಲ್: {em}',
  },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateSegment(text, pair) {
  const u = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
  const res = await fetch(u);
  const j = await res.json();
  if (j.responseStatus !== 200) throw new Error(j.responseDetails || 'mt fail');
  const out = String(j.responseData?.translatedText ?? text);
  if (/MYMEMORY WARNING/i.test(out)) throw new Error('quota');
  return out;
}

/** Split on {…} and translate literal runs only. */
async function translatePreservingBraces(value, pair) {
  if (!value.includes('{')) return translateSegment(value, pair);
  const parts = value.split(/(\{[^}]+\})/g);
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (/^\{[^}]+\}$/.test(p)) out.push(p);
    else if (p.trim()) out.push(await translateSegment(p, pair));
    else out.push(p);
  }
  return out.join('');
}

async function main() {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const keys = Object.keys(en);

  for (const lang of ['hi', 'zh', 'ja', 'kn']) {
    const pair = LANGPAIR[lang];
    const manual = MANUAL[lang] || {};
    const result = {};
    console.log('Lang', lang, 'keys', keys.length);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = en[k];
      if (manual[k]) {
        result[k] = manual[k];
        continue;
      }
      try {
        result[k] = await translatePreservingBraces(v, pair);
      } catch (e) {
        console.warn('fallback en', k, e.message);
        result[k] = v;
      }
      if (i % 5 === 0) await sleep(200);
      else await sleep(120);
    }
    fs.writeFileSync(path.join(outDir, `${lang}.json`), JSON.stringify(result, null, 2), 'utf8');
    console.log('Wrote', lang + '.json');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
