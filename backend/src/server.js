import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import { logAiProvidersStartup } from './services/aiManager.js';
import { logVisionProvidersStartup } from './services/visionService.js';
import { startMedicineReminderScheduler } from './services/medicineReminderService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const corsStaticOrigins = new Set([
  config.frontendUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsStaticOrigins.has(origin)) return callback(null, true);
      if (config.nodeEnv !== 'production') {
        // Reflect any browser Origin (LAN IP, ngrok, etc.). Required when frontend uses
        // absolute VITE_API_URL — otherwise chat/SOS fail CORS outside localhost:5173.
        try {
          const u = new URL(origin);
          if (u.protocol === 'http:' || u.protocol === 'https:') return callback(null, true);
        } catch {
          /* ignore */
        }
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'aegis-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

/** Saved triage/SOS PDFs (public read; filenames are unguessable UUID-style). */
const reportsDir = path.resolve(__dirname, '../uploads/reports');
const imagesDir = path.resolve(__dirname, '../uploads/images');
app.use('/uploads/reports', express.static(reportsDir));
app.use('/uploads/images', express.static(imagesDir));

// Optional: serve built frontend in production
const dist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(dist));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api') || _req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(config.port, async () => {
  // eslint-disable-next-line no-console
  console.log(`AEGIS backend listening on :${config.port}`);
  try {
    await fs.mkdir(reportsDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[AEGIS] could not create reports directory:', e?.message || e);
  }
  try {
    await logAiProvidersStartup();
    logVisionProvidersStartup();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[AEGIS-AI] startup provider scan failed:', e?.message || e);
  }
  startMedicineReminderScheduler();
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY) {
    // eslint-disable-next-line no-console
    console.log('[AEGIS-AI] HTTP(S)_PROXY or ALL_PROXY is set — outbound cloud AI calls may use the configured proxy');
  }
});
