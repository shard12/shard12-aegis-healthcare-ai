import axios from 'axios';
import type {
  AegisUser,
  AiProviderStatus,
  ImageScanResponse,
  TriageEnvelope,
  TriageReportMeta,
} from '@/types/aegis';

/** Dev: relative `/api/` + Vite proxy. Prod: set VITE_API_URL to backend root including `/api`, e.g. `https://api.example.com/api/` */
function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const fallback = '/api';
  if (!raw) {
    return fallback.endsWith('/') ? fallback : `${fallback}/`;
  }
  let base = raw.endsWith('/') ? raw : `${raw}/`;
  if (base.startsWith('http://') || base.startsWith('https://')) {
    try {
      const u = new URL(base);
      const path = u.pathname.replace(/\/+$/, '');
      if (!path.endsWith('/api')) {
        u.pathname = `${path === '' ? '' : path}/api`.replace(/\/+/g, '/');
        base = u.toString();
        if (!base.endsWith('/')) base = `${base}/`;
      }
    } catch {
      /* keep base */
    }
  }
  return base;
}

const baseURL = resolveApiBase();

/** Same base the axios client uses (for OAuth redirect URL, etc.). */
export function getResolvedApiBase(): string {
  return baseURL;
}

const api = axios.create({
  baseURL,
  /** LLM + network can be slow; avoid infinite hang (SOS/email was blocking the API for minutes). */
  timeout: 120_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aegis_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email: string, password: string) {
  const { data } = await api.post<{ token: string; user: AegisUser }>('auth/login', { email, password });
  return data;
}

export async function register(email: string, password: string, name?: string) {
  const { data } = await api.post<{ token: string; user: AegisUser }>('auth/register', { email, password, name });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<{ user: AegisUser }>('auth/me');
  return data.user;
}

export async function saveProfile(payload: { name?: string; profile?: Partial<AegisUser['profile']> }) {
  const { data } = await api.patch<{ user: AegisUser }>('auth/profile', payload);
  return data.user;
}

export async function saveSettings(settings: Partial<AegisUser['settings']>) {
  const { data } = await api.patch<{ user: AegisUser }>('auth/settings', settings);
  return data.user;
}

export async function triage(
  message: string,
  lat?: number,
  lng?: number,
  language?: string,
  accuracy?: number,
  tracking?: boolean
) {
  const { data } = await api.post<{
    envelope: TriageEnvelope;
    alerts: { telegramStatus: string; emailStatus: string };
    historyId: string;
    ai: AiProviderStatus;
    report: TriageReportMeta;
  }>('ai/triage', { message, lat, lng, language, accuracy, tracking });
  return data;
}

export async function chat(message: string, language?: string) {
  const { data } = await api.post<{ reply: string; envelope: TriageEnvelope; ai: AiProviderStatus }>('ai/chat', {
    message,
    language,
  });
  return data;
}

export async function dispatchSos(body: {
  lat?: number;
  lng?: number;
  accuracy?: number;
  risk?: string;
  notes?: string;
  tracking?: boolean;
}) {
  const { data } = await api.post('sos/dispatch', body, { timeout: 55_000 });
  return data as {
    ok: boolean;
    results: { telegram: { status: string; error?: string }; email: { status: string; error?: string } };
    report?: TriageReportMeta;
    logId: string;
  };
}

export async function fetchHospitals(lat: number, lon: number) {
  const { data } = await api.get<{ label: string; hospitals: unknown[] }>('hospitals', { params: { lat, lon } });
  return data;
}

export async function fetchHistory() {
  const { data } = await api.get<{ items: unknown[] }>('history');
  return data.items;
}

export async function fetchMedicines() {
  const { data } = await api.get<{ items: unknown[]; telegramConfigured?: boolean }>('medicines');
  return data.items;
}

export async function createMedicine(item: Record<string, unknown>) {
  const { data } = await api.post<{ item: unknown }>('medicines', item);
  return data.item;
}

export async function patchMedicine(id: string, item: Record<string, unknown>) {
  const { data } = await api.patch<{ item: unknown }>(`medicines/${id}`, item);
  return data.item;
}

async function parsePdfBlobResponse(res: { data: Blob; headers: Record<string, string> }) {
  const ct = res.headers['content-type'] || '';
  if (ct.includes('application/json') || (res.data instanceof Blob && res.data.size < 4000)) {
    const peek = await res.data.slice(0, 200).text();
    if (peek.trimStart().startsWith('{')) {
      const full = await res.data.text();
      const err = JSON.parse(full) as { error?: string };
      throw new Error(err.error || 'PDF could not be generated. Is the backend running on port 8787?');
    }
  }
  return res.data;
}

export async function downloadIncidentPdf(payload: Record<string, unknown>) {
  const res = await api.post('pdf/incident', payload, { responseType: 'blob' });
  return parsePdfBlobResponse(res);
}

export async function downloadTriagePdf(payload: Record<string, unknown>) {
  const res = await api.post('pdf/triage', payload, { responseType: 'blob' });
  return parsePdfBlobResponse(res);
}

export async function fetchReports() {
  const { data } = await api.get<{ items: ReportVaultItem[] }>('reports');
  return data.items;
}

export async function fetchPublicReport(token: string) {
  const { data } = await api.get<{ report: ReportVaultItem }>(`reports/public/${token}`);
  return data.report;
}

export async function notifyMedicine(id: string) {
  const { data } = await api.post<{ ok: boolean; status: string; error?: string }>(`medicines/${id}/notify`);
  return data;
}

export type ReportVaultItem = {
  id: string;
  kind: string;
  title: string;
  risk?: string;
  summary?: string;
  incidentId?: string;
  pdfUrl?: string | null;
  pdfFilename?: string;
  accessToken?: string;
  viewUrl?: string;
  createdAt: string;
};

export async function checkBackendHealth() {
  try {
    const base = getResolvedApiBase().replace(/\/api\/?$/, '');
    const { data } = await axios.get<{ ok: boolean }>(`${base}/health`, { timeout: 4000 });
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function analyzeMedicalImage(file: File) {
  const form = new FormData();
  form.append('image', file);
  const { data } = await api.post<ImageScanResponse>('ai/analyze-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  return data;
}

export async function fetchImageReports() {
  const { data } = await api.get<{ items: unknown[] }>('reports/images');
  return data.items;
}

/** Full URL to start Google OAuth (browser redirect). Matches axios API base (includes /api/). */
export function getGoogleOAuthStartUrl() {
  return `${getResolvedApiBase()}auth/google`;
}

export { api };
