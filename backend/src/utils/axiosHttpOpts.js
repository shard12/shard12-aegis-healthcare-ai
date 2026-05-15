import axios from 'axios';

/**
 * Optional corporate proxy for outbound HTTPS (Groq/OpenRouter removed; kept for cloud AI calls).
 */
export function axiosProxyOptions() {
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (!raw) return {};
  try {
    const u = new URL(raw.trim());
    const protocol = (u.protocol || 'http:').replace(':', '');
    const port = u.port ? Number(u.port) : protocol === 'https' ? 443 : 80;
    const opt = { protocol, host: u.hostname, port };
    if (u.username) {
      opt.auth = {
        username: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password || ''),
      };
    }
    return { proxy: opt };
  } catch {
    return {};
  }
}

/** Short-lived HTTP client options for AI calls (per-request timeout also capped by withTimeout). */
export function cloudAiAxiosOpts(extraTimeoutMs = 4500) {
  return {
    timeout: extraTimeoutMs,
    validateStatus: (s) => s < 600,
    ...axiosProxyOptions(),
  };
}
