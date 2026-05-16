import axios from 'axios';
import { config } from '../config/index.js';
import { withTimeout } from '../utils/withTimeout.js';

/**
 * Local primary: Ollama HTTP API (/api/generate, stream=false).
 * If Ollama is not running, connection errors bubble up — the orchestrator skips after failure and continues to cloud providers.
 */

function messagesToPrompt(messages) {
  return messages
    .map((m) => {
      const role = String(m.role || 'user').toUpperCase();
      return `${role}: ${m.content}`;
    })
    .join('\n\n');
}

export const ollamaProvider = {
  name: 'ollama',

  /** Ollama is attempted unless explicitly disabled (no API key required). */
  isConfigured() {
    const d = String(process.env.OLLAMA_DISABLED || '')
      .trim()
      .toLowerCase();
    return d !== '1' && d !== 'true' && d !== 'yes';
  },

  /**
   * @param {Array<{ role: string, content: string }>} messages
   * @returns {Promise<string>}
   */
  async generate(messages) {
    const base = String(config.ollama.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    const url = `${base}/api/generate`;
    const { data, status } = await axios.post(
      url,
      {
        model: config.ollama.model,
        prompt: messagesToPrompt(messages),
        stream: false,
        options: { num_predict: 900, temperature: 0.2 },
      },
      { timeout: 4500, validateStatus: () => true }
    );
    if (status >= 400) {
      const err = new Error(typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : `http_${status}`);
      err.status = status;
      throw err;
    }
    if (data?.error) throw Object.assign(new Error(String(data.error)), { status: data.status });
    const text = typeof data?.response === 'string' ? data.response : '';
    if (!String(text).trim()) throw new Error('empty_response');
    return String(text).trim();
  },
};

/**
 * Fast startup probe: if Ollama is not installed / not running, we skip logging it as "ready"
 * and rely on cloud fallbacks without delaying server listen.
 */
export async function probeOllamaReachable() {
  try {
    const base = String(config.ollama.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    await withTimeout(800, () => axios.get(`${base}/api/tags`, { timeout: 900, validateStatus: (s) => s < 500 }));
    return true;
  } catch {
    return false;
  }
}
