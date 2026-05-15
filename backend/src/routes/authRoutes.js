import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const r = Router();

r.post('/register', authLimiter, auth.register);
r.post('/login', authLimiter, auth.login);
r.get('/google', auth.googleAuthStart);
r.get('/google/callback', auth.googleAuthCallback);
r.get('/me', requireAuth, auth.me);
r.patch('/profile', requireAuth, auth.updateProfile);
r.patch('/settings', requireAuth, auth.updateSettings);

export default r;
