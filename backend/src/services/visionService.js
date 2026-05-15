/**
 * Medical image analysis — Gemini Vision → OpenRouter → HuggingFace → safe offline fallback.
 * Never claims exact diagnosis; always includes disclaimer.
 */
import fs from 'fs/promises';
import axios from 'axios';
import { config } from '../config/index.js';
import { generateAIResponse } from './aiManager.js';

export const MEDICAL_DISCLAIMER =
  'AI-generated preliminary assessment. Consult a medical professional for confirmation.';

const LOG = '[AEGIS-VISION]';

const ANALYSIS_SCHEMA = `Return ONLY valid JSON (no markdown fences):
{
  "possible_condition": "brief non-definitive summary using may/could language",
  "severity": "Low" | "Moderate" | "High",
  "confidence": "percentage as string e.g. 72%",
  "observations": ["bullet 1", "bullet 2"],
  "finding_screen": {
    "visible_abnormalities": "none noted or describe cautiously",
    "inflammation": "none noted or describe",
    "fractures": "none noted or describe (if applicable)",
    "lesions": "none noted or describe",
    "tumors": "none noted or describe",
    "infections": "none noted or describe",
    "tissue_irregularities": "none noted or describe",
    "neurological_if_mri": "not applicable, or cautious note if MRI/brain scan"
  },
  "recommendation": "recommended next action for patient",
  "emergency": false
}`;

const VISION_PROMPT = `You are an AI medical imaging assistant for AEGIS AI.

Analyze the uploaded medical image carefully. Image types may include skin photos, wounds, X-rays, prescriptions, lab screenshots, CT/MRI slices, or other clinical photos.

Systematically evaluate and comment on (when visible or inferable from image type):
- visible abnormalities
- inflammation
- fractures (especially musculoskeletal / X-ray)
- lesions
- tumors (never assert malignancy with certainty)
- infections
- tissue irregularities
- possible neurological abnormalities if the image appears to be MRI or brain scan (otherwise state "not applicable")

Return:
- possible_condition (preliminary, non-definitive)
- severity level (Low | Moderate | High)
- confidence score as a percentage string
- observations (array of concise clinical observation bullets)
- finding_screen (object with one line per category above)
- recommendation (recommended next action)
- emergency (true only if emergency care may be needed)

CRITICAL RULES:
- NEVER claim a certain diagnosis. Do not say "definitely", "confirmed", or "you have X".
- Always use cautious language: "may suggest", "could indicate", "worth clinical correlation".
- If image quality is poor or finding is uncertain, say so in observations.
- This is an AI-generated preliminary assessment — the patient must consult a licensed professional.

${ANALYSIS_SCHEMA}`;

/** Models that support generateContent + vision on the current Gemini API. */
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

/** OpenRouter models known to accept image_url content. */
const OPENROUTER_VISION_MODELS = ['openai/gpt-4o-mini', 'google/gemini-2.5-flash', 'google/gemma-2-9b-it:free'];

function uniqueModels(primary, fallbacks) {
  const out = [];
  for (const m of [primary, ...fallbacks]) {
    const t = String(m || '').trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

function logProviderFail(provider, model, err) {
  const status = err?.response?.status;
  const msg =
    err?.response?.data?.error?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'unknown';
  // eslint-disable-next-line no-console
  console.error(`${LOG} ${provider} model=${model} status=${status || '—'} reason=${String(msg).slice(0, 200)}`);
}

function asStringArray(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/\n|;/)
      .map((s) => s.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeFindingScreen(raw) {
  const src = raw?.finding_screen || raw?.findings || raw?.screening || {};
  const keys = [
    ['visible_abnormalities', 'Visible abnormalities'],
    ['inflammation', 'Inflammation'],
    ['fractures', 'Fractures'],
    ['lesions', 'Lesions'],
    ['tumors', 'Tumors'],
    ['infections', 'Infections'],
    ['tissue_irregularities', 'Tissue irregularities'],
    ['neurological_if_mri', 'Neurological (MRI)'],
  ];
  const out = {};
  for (const [k, label] of keys) {
    const val = src[k] ?? src[label] ?? src[k.replace(/_/g, ' ')] ?? null;
    if (val != null && String(val).trim()) out[k] = String(val).trim();
  }
  return out;
}

function observationsFromParsed(parsed) {
  let obs = asStringArray(parsed?.observations);
  if (obs.length) return obs;
  const screen = normalizeFindingScreen(parsed);
  obs = Object.entries(screen)
    .filter(([, v]) => v && !/^none noted|not applicable|n\/a/i.test(v))
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return `${label}: ${v}`;
    });
  return obs.length ? obs : ['No specific abnormalities confidently identified — clinical review advised.'];
}

function normalizeAnalysis(raw, provider = 'unknown') {
  let parsed = null;
  const text = String(raw || '').trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      /* fall through */
    }
  }

  const sevRaw = String(parsed?.severity || parsed?.risk_level || parsed?.risk || 'Moderate').toLowerCase();
  let severity = 'Moderate';
  if (/high|critical|urgent|severe/.test(sevRaw)) severity = 'High';
  else if (/low|minor|routine/.test(sevRaw)) severity = 'Low';

  const recommendation =
    String(
      parsed?.recommendation ||
        parsed?.recommended_next_action ||
        parsed?.recommended_action ||
        parsed?.next_steps ||
        ''
    ).trim() || 'Schedule an in-person evaluation with a licensed clinician.';

  const emergency =
    Boolean(parsed?.emergency ?? parsed?.emergency_care_needed ?? parsed?.emergency_care) ||
    severity === 'High' ||
    /emergency|urgent|911|immediate|er visit/i.test(recommendation);

  const finding_screen = parsed ? normalizeFindingScreen(parsed) : {};

  return {
    possible_condition:
      String(parsed?.possible_condition || parsed?.condition || '').trim() ||
      'Visual findings require professional review — no definitive condition identified.',
    severity,
    confidence: String(parsed?.confidence || parsed?.confidence_score || '—').trim() || '—',
    observations: parsed ? observationsFromParsed(parsed) : [],
    finding_screen,
    recommendation,
    emergency,
    disclaimer: MEDICAL_DISCLAIMER,
    provider,
    analyzed_at: new Date().toISOString(),
  };
}

async function readImageBase64(filePath) {
  const buf = await fs.readFile(filePath);
  return buf.toString('base64');
}

function mimeFromPath(filePath) {
  const p = String(filePath).toLowerCase();
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function analyzeWithGeminiModel(filePath, mime, model) {
  const b64 = await readImageBase64(filePath);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${config.gemini.apiKey}`;
  const { status, data } = await axios.post(
    url,
    {
      contents: [
        {
          parts: [
            { text: VISION_PROMPT },
            { inline_data: { mime_type: mime, data: b64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1400 },
    },
    { timeout: 60000, validateStatus: () => true }
  );
  if (status >= 400) {
    const err = new Error(data?.error?.message || `HTTP ${status}`);
    err.response = { status, data };
    throw err;
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text.trim()) return null;
  return normalizeAnalysis(text, `gemini:${model}`);
}

async function analyzeWithGemini(filePath, mime) {
  if (!config.gemini.apiKey) return null;
  const models = uniqueModels(config.gemini.model, GEMINI_FALLBACK_MODELS);
  for (const model of models) {
    try {
      const result = await analyzeWithGeminiModel(filePath, mime, model);
      if (result) {
        // eslint-disable-next-line no-console
        console.log(`${LOG} gemini_success model=${model}`);
        return result;
      }
    } catch (e) {
      logProviderFail('gemini', model, e);
    }
  }
  return null;
}

async function analyzeWithOpenRouterModel(filePath, mime, model) {
  const b64 = await readImageBase64(filePath);
  const dataUrl = `data:${mime};base64,${b64}`;
  const { status, data } = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1400,
    },
    {
      timeout: 60000,
      validateStatus: () => true,
      headers: {
        Authorization: `Bearer ${config.openrouter.apiKey}`,
        'HTTP-Referer': config.frontendUrl,
        'X-Title': 'AEGIS AI',
      },
    }
  );
  if (status >= 400) {
    const err = new Error(data?.error?.message || `HTTP ${status}`);
    err.response = { status, data };
    throw err;
  }
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text.trim()) return null;
  return normalizeAnalysis(text, `openrouter:${model}`);
}

async function analyzeWithOpenRouter(filePath, mime) {
  if (!config.openrouter.apiKey) return null;
  const models = uniqueModels(config.openrouter.model, OPENROUTER_VISION_MODELS);
  for (const model of models) {
    try {
      const result = await analyzeWithOpenRouterModel(filePath, mime, model);
      if (result) {
        // eslint-disable-next-line no-console
        console.log(`${LOG} openrouter_success model=${model}`);
        return result;
      }
    } catch (e) {
      logProviderFail('openrouter', model, e);
    }
  }
  return null;
}

async function analyzeWithHuggingFace(filePath) {
  if (!config.huggingface.apiKey) return null;
  const buf = await fs.readFile(filePath);
  const { status, data } = await axios.post(
    `https://api-inference.huggingface.co/models/${config.huggingface.model}`,
    buf,
    {
      timeout: 60000,
      validateStatus: () => true,
      headers: {
        Authorization: `Bearer ${config.huggingface.apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
    }
  );
  if (status >= 400) {
    const err = new Error(typeof data?.error === 'string' ? data.error : `HTTP ${status}`);
    err.response = { status, data };
    throw err;
  }
  const caption = Array.isArray(data)
    ? data[0]?.generated_text || data[0]?.label
    : data?.generated_text || data?.[0]?.generated_text;
  if (!caption) return null;
  const fallbackJson = JSON.stringify({
    possible_condition: `Image caption suggests: ${String(caption).slice(0, 200)} (preliminary only)`,
    severity: 'Moderate',
    confidence: '45%',
    observations: [`Caption-based note: ${String(caption).slice(0, 180)}`],
    finding_screen: {
      visible_abnormalities: 'Assessed from caption only — full vision unavailable',
      inflammation: 'not assessed',
      fractures: 'not assessed',
      lesions: 'not assessed',
      tumors: 'not assessed',
      infections: 'not assessed',
      tissue_irregularities: 'not assessed',
      neurological_if_mri: 'not applicable',
    },
    recommendation: 'Have a clinician review this image in person.',
    emergency: false,
  });
  const enriched = await generateAIResponse({
    messages: [
      {
        role: 'user',
        content: `${VISION_PROMPT}\n\nImage caption from vision model: ${caption}`,
      },
    ],
    fallbackJson,
  });
  return normalizeAnalysis(enriched, 'huggingface+text');
}

async function offlineFallback(lastError) {
  const hint = lastError
    ? `Last error: ${String(lastError).slice(0, 120)}. `
    : '';
  return normalizeAnalysis(
    JSON.stringify({
      possible_condition: 'Unable to run cloud vision — image saved for manual review',
      severity: 'Moderate',
      confidence: 'N/A',
      observations: ['Automated vision providers unavailable or returned no analysis.'],
      finding_screen: {
        visible_abnormalities: 'not assessed',
        inflammation: 'not assessed',
        fractures: 'not assessed',
        lesions: 'not assessed',
        tumors: 'not assessed',
        infections: 'not assessed',
        tissue_irregularities: 'not assessed',
        neurological_if_mri: 'not assessed',
      },
      recommendation: `${hint}Set GEMINI_MODEL=gemini-2.5-flash and OPENROUTER_VISION_MODEL=openai/gpt-4o-mini in backend/.env, then restart the server.`,
      emergency: false,
    }),
    'offline'
  );
}

/** Log which vision providers are configured (startup). */
export function logVisionProvidersStartup() {
  // eslint-disable-next-line no-console
  console.log(
    `${LOG} startup gemini=${Boolean(config.gemini.apiKey)} model=${config.gemini.model} openrouter=${Boolean(config.openrouter.apiKey)} model=${config.openrouter.model} hf=${Boolean(config.huggingface.apiKey)}`
  );
}

/**
 * @param {string} filePath absolute path on disk
 */
export async function analyzeMedicalImage(filePath) {
  const mime = mimeFromPath(filePath);
  let lastError = null;
  const chain = [
    () => analyzeWithGemini(filePath, mime),
    () => analyzeWithOpenRouter(filePath, mime),
    () => analyzeWithHuggingFace(filePath),
  ];
  for (const fn of chain) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (e) {
      lastError = e?.response?.data?.error?.message || e?.message || e;
      console.error(`${LOG}`, lastError);
    }
  }
  return offlineFallback(lastError);
}
