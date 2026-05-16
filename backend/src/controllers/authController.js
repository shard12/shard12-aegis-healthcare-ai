import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  updateUser,
} from '../database/db.js';
import { signToken, signOauthState, verifyOauthState } from '../utils/jwt.js';
import { config } from '../config/index.js';

function stripUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  rest.settings = mergeDefaultSettings(rest.settings);
  return rest;
}

const DEFAULT_SETTINGS = {
  language: 'en',
  darkMode: true,
  largeText: false,
  vibrations: true,
  telegramChatId: '',
  telegramGroupId: '',
  alertEmail: '',
  alertPhone: '',
};

function mergeDefaultSettings(s) {
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

function getGoogleRedirectUri(req) {
  if (config.google.redirectUri) return config.google.redirectUri;
  return `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
}

function redirectFrontend(res, query) {
  const base = config.frontendUrl.replace(/\/$/, '');
  const qs = new URLSearchParams(query).toString();
  res.redirect(302, `${base}/auth/callback?${qs}`);
}

export async function register(req, res) {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (findUserByEmail(email)) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = createUser({ email, passwordHash, name: name || 'Operator' });
    const token = signToken({ sub: user.id, email: user.email });
    res.json({ token, user: stripUser(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    const user = findUserByEmail(email || '');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ sub: user.id, email: user.email });
    res.json({ token, user: stripUser(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function me(req, res) {
  const user = findUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: stripUser(user) });
}

export async function updateProfile(req, res) {
  const body = req.body || {};
  const patch = {};
  if (body.name) patch.name = String(body.name).trim();
  if (body.profile && typeof body.profile === 'object') {
    patch.profile = body.profile;
  } else if (!body.name) {
    patch.profile = body;
  }
  const user = updateUser(req.user.sub, patch);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: stripUser(user) });
}

export async function updateSettings(req, res) {
  const cur = findUserById(req.user.sub);
  if (!cur) return res.status(404).json({ error: 'User not found' });
  const merged = mergeDefaultSettings({ ...cur.settings, ...(req.body || {}) });
  const user = updateUser(req.user.sub, { settings: merged });
  res.json({ user: stripUser(user) });
}

export function googleAuthStart(req, res) {
  if (!config.google.clientId || !config.google.clientSecret) {
    return res
      .status(501)
      .type('html')
      .send(
        '<html><body style="font-family:system-ui;background:#000;color:#fff;padding:24px">Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the API server.</body></html>'
      );
  }
  try {
    const state = signOauthState();
    const redirectUri = getGoogleRedirectUri(req);
    const url =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: config.google.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
        state,
      }).toString();
    res.redirect(302, url);
  } catch (e) {
    res.status(500).type('text').send(e.message || 'OAuth start failed');
  }
}

export async function googleAuthCallback(req, res) {
  const fail = (msg) => redirectFrontend(res, { error: msg });

  try {
    const { code, state, error, error_description: errorDescription } = req.query;
    if (error) return fail(String(errorDescription || error));
    if (!code || !state) return fail('missing_code');

    verifyOauthState(String(state));

    const redirectUri = getGoogleRedirectUri(req);
    const body = new URLSearchParams({
      code: String(code),
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 25000,
    });

    const { data: gp } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      timeout: 25000,
    });

    if (!gp?.id || !gp?.email) return fail('google_profile_incomplete');

    let user = findUserByGoogleId(String(gp.id));
    if (!user) {
      const byEmail = findUserByEmail(String(gp.email));
      if (byEmail) {
        user = updateUser(byEmail.id, {
          googleId: String(gp.id),
          name: gp.name || byEmail.name,
          avatarUrl: gp.picture || byEmail.avatarUrl || '',
        });
      } else {
        const passwordHash = await bcrypt.hash(crypto.randomBytes(28).toString('hex'), 10);
        user = createUser({
          email: String(gp.email),
          passwordHash,
          name: gp.name || String(gp.email).split('@')[0] || 'Operator',
          googleId: String(gp.id),
          avatarUrl: gp.picture ? String(gp.picture) : '',
        });
      }
    } else {
      user = updateUser(user.id, {
        name: gp.name || user.name,
        avatarUrl: gp.picture || user.avatarUrl || '',
      });
    }

    const token = signToken({ sub: user.id, email: user.email });
    redirectFrontend(res, { token });
  } catch (e) {
    const msg = e?.response?.data?.error_description || e?.response?.data?.error || e.message || 'oauth_failed';
    return fail(String(msg));
  }
}
