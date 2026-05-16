import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load repo-root .env first (common when copying .env.example to project root), then backend/.env, then cwd.
const repoRootEnv = path.resolve(__dirname, '../../../.env');
const backendEnv = path.resolve(__dirname, '../../.env');
dotenv.config({ path: repoRootEnv });
dotenv.config({ path: backendEnv, override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

/** Strip BOM/whitespace from .env values (common on Windows editors). */
function envStr(v) {
  return String(v ?? '')
    .replace(/^\uFEFF/, '')
    .trim();
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 8787,
  frontendUrl: envStr(process.env.FRONTEND_URL) || 'http://localhost:5173',
  /** Public base URL for absolute PDF links in email (no trailing slash). Default localhost backend. */
  apiPublicBaseUrl: envStr(process.env.API_PUBLIC_BASE_URL) || `http://localhost:${Number(process.env.PORT) || 8787}`,
  jwtSecret: envStr(process.env.JWT_SECRET) || 'dev-only-change-me',

  /** Local Ollama — primary for low latency (no API key). */
  ollama: {
    baseUrl: envStr(process.env.OLLAMA_BASE_URL) || 'http://localhost:11434',
    model: envStr(process.env.OLLAMA_MODEL) || 'llama3',
  },

  /** Cloudflare Workers AI (OpenAI-compatible HTTP API). */
  cloudflare: {
    accountId: envStr(process.env.CF_ACCOUNT_ID),
    apiToken: envStr(process.env.CF_API_TOKEN),
    model: envStr(process.env.CF_WORKERS_AI_MODEL) || '@cf/meta/llama-3.1-8b-instruct',
  },

  cerebras: {
    apiKey: envStr(process.env.CEREBRAS_API_KEY),
    baseUrl: envStr(process.env.CEREBRAS_BASE_URL) || 'https://api.cerebras.ai/v1',
    model: envStr(process.env.CEREBRAS_MODEL) || 'llama3.1-8b',
  },

  together: {
    apiKey: envStr(process.env.TOGETHER_API_KEY),
    baseUrl: envStr(process.env.TOGETHER_BASE_URL) || 'https://api.together.xyz/v1',
    model:
      envStr(process.env.TOGETHER_MODEL) || 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
  },

  telegram: {
    token: envStr(process.env.TELEGRAM_BOT_TOKEN),
    chatId: envStr(process.env.TELEGRAM_CHAT_ID),
    groupId: envStr(process.env.TELEGRAM_GROUP_ID),
  },
  email: {
    host: envStr(process.env.EMAIL_HOST) || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    user: envStr(process.env.EMAIL_USER),
    /** Gmail app passwords are often copied with spaces; SMTP expects 16 chars without spaces. */
    pass: String(process.env.EMAIL_PASS || '')
      .replace(/^\uFEFF/, '')
      .replace(/\s+/g, ''),
    from: envStr(process.env.EMAIL_FROM) || 'AEGIS AI <noreply@aegis.local>',
  },
  google: {
    clientId: envStr(process.env.GOOGLE_CLIENT_ID),
    clientSecret: envStr(process.env.GOOGLE_CLIENT_SECRET),
    /** Must match Google Cloud "Authorized redirect URIs" exactly (e.g. https://api.example.com/api/auth/google/callback) */
    redirectUri: envStr(process.env.GOOGLE_REDIRECT_URI),
  },
  osmUserAgent: envStr(process.env.OSM_USER_AGENT) || 'AEGIS-AI-Healthcare-OS/1.0',

  /** Google Gemini — vision + text (optional). */
  gemini: {
    apiKey: envStr(process.env.GEMINI_API_KEY) || envStr(process.env.GOOGLE_API_KEY),
    /** gemini-1.5-flash is retired on v1beta — use 2.5 flash family */
    model: envStr(process.env.GEMINI_MODEL) || 'gemini-2.5-flash',
  },

  /** OpenRouter — vision-capable chat (optional). */
  openrouter: {
    apiKey: envStr(process.env.OPENROUTER_API_KEY),
    model: envStr(process.env.OPENROUTER_VISION_MODEL) || 'openai/gpt-4o-mini',
  },

  /** Hugging Face inference (optional image caption / VLM). */
  huggingface: {
    apiKey: envStr(process.env.HF_API_KEY),
    model: envStr(process.env.HF_VISION_MODEL) || 'Salesforce/blip-image-captioning-large',
  },

  /** TextBelt — simple SMS (use key `textbelt` for one free test per day). */
  textbelt: {
    apiKey: envStr(process.env.TEXTBELT_API_KEY) || 'textbelt',
  },

  twilio: {
    accountSid: envStr(process.env.TWILIO_ACCOUNT_SID),
    authToken: envStr(process.env.TWILIO_AUTH_TOKEN),
    fromNumber: envStr(process.env.TWILIO_PHONE_NUMBER),
  },

  uploads: {
    maxBytes: Number(process.env.UPLOAD_MAX_BYTES) || 8 * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/png', 'image/webp'],
  },
};
