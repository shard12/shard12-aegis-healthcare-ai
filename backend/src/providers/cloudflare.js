import axios from 'axios';
import { config } from '../config/index.js';
import { cloudAiAxiosOpts } from '../utils/axiosHttpOpts.js';

/**
 * Cloudflare Workers AI — OpenAI-compatible chat completions on the account HTTP API.
 * Model: @cf/meta/llama-3.1-8b-instruct (Workers AI catalog).
 */

export const cloudflareProvider = {
  name: 'cloudflare',

  isConfigured() {
    return Boolean(config.cloudflare.accountId && config.cloudflare.apiToken);
  },

  /**
   * @param {Array<{ role: string, content: string }>} messages
   * @returns {Promise<string>}
   */
  async generate(messages) {
    const { accountId, apiToken, model } = config.cloudflare;
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
    const { data, status } = await axios.post(
      url,
      {
        model,
        messages,
        max_tokens: 900,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
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
    if (data && data.success === false) {
      const err = new Error(JSON.stringify(data.errors || data).slice(0, 400));
      err.status = status || 502;
      throw err;
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!String(text || '').trim()) throw new Error('empty_response');
    return String(text).trim();
  },
};
