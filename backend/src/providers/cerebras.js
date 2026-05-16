import axios from 'axios';
import { config } from '../config/index.js';
import { cloudAiAxiosOpts } from '../utils/axiosHttpOpts.js';

/**
 * Cerebras Inference API (OpenAI-compatible chat completions).
 */

export const cerebrasProvider = {
  name: 'cerebras',

  isConfigured() {
    return Boolean(config.cerebras.apiKey);
  },

  /**
   * @param {Array<{ role: string, content: string }>} messages
   * @returns {Promise<string>}
   */
  async generate(messages) {
    const url = `${String(config.cerebras.baseUrl || 'https://api.cerebras.ai/v1').replace(/\/+$/, '')}/chat/completions`;
    const { data, status } = await axios.post(
      url,
      {
        model: config.cerebras.model,
        messages,
        max_tokens: 900,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${config.cerebras.apiKey}`,
          'Content-Type': 'application/json',
        },
        ...cloudAiAxiosOpts(4500),
      }
    );
    if (status === 429) {
      const err = new Error('rate_limited');
      err.status = 429;
      throw err;
    }
    if (status >= 400) {
      const err = new Error(typeof data === 'object' ? JSON.stringify(data).slice(0, 400) : String(data));
      err.status = status;
      throw err;
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!String(text || '').trim()) throw new Error('empty_response');
    return String(text).trim();
  },
};
