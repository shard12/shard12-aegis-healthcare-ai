import axios from 'axios';
import { config } from '../config/index.js';
import { cloudAiAxiosOpts } from '../utils/axiosHttpOpts.js';

/**
 * Together AI — OpenAI-compatible chat completions.
 */

export const togetherProvider = {
  name: 'together',

  isConfigured() {
    return Boolean(config.together.apiKey);
  },

  /**
   * @param {Array<{ role: string, content: string }>} messages
   * @returns {Promise<string>}
   */
  async generate(messages) {
    const url = `${String(config.together.baseUrl || 'https://api.together.xyz/v1').replace(/\/+$/, '')}/chat/completions`;
    const { data, status } = await axios.post(
      url,
      {
        model: config.together.model,
        messages,
        max_tokens: 900,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${config.together.apiKey}`,
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
