/**
 * AEGIS AI — multi-provider orchestration (master entry for Express / aiService).
 *
 * Provider flow (strict priority):
 *   1) Ollama (local, fastest when running)
 *   2) Cloudflare Workers AI
 *   3) Cerebras
 *   4) Together AI
 *
 * Fallback logic:
 *   - Each provider gets up to 2 attempts (initial + one retry) on failure, timeout, HTTP 429, or empty body.
 *   - Each attempt is wrapped in Promise.race via withTimeout(PROVIDER_TIMEOUT_MS).
 *   - If a provider is not configured (missing env), it is skipped with provider_skipped.
 *   - If Ollama is not running, connection errors are handled like any other failure — next provider runs.
 *   - If every provider fails, generateAIResponse returns fallbackJson (never throws — keeps Express stable).
 */

import { withTimeout } from '../utils/withTimeout.js';
import { ollamaProvider, probeOllamaReachable } from './ollama.js';
import { cloudflareProvider } from './cloudflare.js';
import { cerebrasProvider } from './cerebras.js';
import { togetherProvider } from './together.js';

/** Priority order: local first for hackathon latency, then cloud resilience. */
const ORDER = [ollamaProvider, cloudflareProvider, cerebrasProvider, togetherProvider];

/** Wall-clock cap per provider attempt (requirement: 4 seconds). */
const PROVIDER_TIMEOUT_MS = 4000;

/** Maximum 1 retry per provider => 2 attempts total (initial + retry). */
const ATTEMPTS_PER_PROVIDER = 2;

const LOG = '[AEGIS-AI]';

function formatFailureReason(err) {
  if (!err) return 'unknown';
  if (err.code === 'TIMEOUT' || /timeout_after_/i.test(String(err.message || ''))) return 'timeout';
  if (err.response?.status === 429 || err.status === 429) return '429';
  if (err.code === 'ECONNREFUSED') return 'connection_refused';
  if (err.code === 'ENOTFOUND') return 'ENOTFOUND';
  if (err.response?.status) return `http_${err.response.status}`;
  const msg = String(err.message || err)
    .replace(/\s+/g, ' ')
    .slice(0, 120);
  return msg || 'unknown';
}

function normalizeInput(input) {
  const defaultFallback = '{"error":"all_providers_failed"}';
  let fallbackJson = defaultFallback;
  try {
    if (typeof input === 'string') {
      return { ok: true, messages: [{ role: 'user', content: input }], fallbackJson };
    }
    if (input && Array.isArray(input.messages)) {
      if (typeof input.fallbackJson === 'string') fallbackJson = input.fallbackJson;
      return { ok: true, messages: input.messages, fallbackJson };
    }
    return { ok: false, messages: null, fallbackJson: defaultFallback };
  } catch {
    return { ok: false, messages: null, fallbackJson: defaultFallback };
  }
}

/**
 * Master AI call: try providers sequentially; return first non-empty completion.
 * Never throws — returns fallbackJson string if the full chain fails (Express stays up).
 *
 * @param {string | { messages: Array<{role:string,content:string}>, fallbackJson?: string }} input
 * @returns {Promise<string>}
 */
export async function generateAIResponse(input) {
  const norm = normalizeInput(input);
  if (!norm.ok || !norm.messages) {
    // eslint-disable-next-line no-console
    console.error(`${LOG} generateAIResponse invalid_input`);
    return norm.fallbackJson || '{"error":"all_providers_failed"}';
  }
  const { messages, fallbackJson } = norm;

  for (const provider of ORDER) {
    if (!provider.isConfigured()) {
      // eslint-disable-next-line no-console
      console.log(`${LOG} provider_skipped provider=${provider.name} reason=not_configured`);
      continue;
    }

    for (let attempt = 1; attempt <= ATTEMPTS_PER_PROVIDER; attempt++) {
      // eslint-disable-next-line no-console
      console.log(`${LOG} trying provider=${provider.name} attempt=${attempt}`);
      try {
        const text = await withTimeout(PROVIDER_TIMEOUT_MS, () => provider.generate(messages));
        const trimmed = String(text || '').trim();
        if (!trimmed) {
          // eslint-disable-next-line no-console
          console.log(`${LOG} provider_failed provider=${provider.name} reason=empty_response`);
          continue;
        }
        // eslint-disable-next-line no-console
        console.log(`${LOG} provider_success provider=${provider.name}`);
        return trimmed;
      } catch (err) {
        const r = formatFailureReason(err);
        // eslint-disable-next-line no-console
        console.log(`${LOG} provider_failed provider=${provider.name} reason=${r}`);
        if (r === 'connection_refused' || r === 'ENOTFOUND') break;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`${LOG} all_providers_exhausted returning_json_fallback`);
  return fallbackJson;
}

/** True if at least one provider can be attempted (Ollama counts unless OLLAMA_DISABLED). */
export function hasConfiguredAiProviders() {
  return ORDER.some((p) => p.isConfigured());
}

/** Startup validation: which providers are configured + quick Ollama reachability. */
export async function logAiProvidersStartup() {
  let ollamaReachable = false;
  if (ollamaProvider.isConfigured()) {
    ollamaReachable = await probeOllamaReachable();
  }
  for (const p of ORDER) {
    const configured = p.isConfigured();
    if (p.name === 'ollama') {
      // eslint-disable-next-line no-console
      console.log(`${LOG} startup provider=${p.name} configured=${configured} reachable=${ollamaReachable}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`${LOG} startup provider=${p.name} configured=${configured}`);
    }
  }
}
