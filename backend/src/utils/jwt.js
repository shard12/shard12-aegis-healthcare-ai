import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '14d' });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function signOauthState() {
  return jwt.sign({ purpose: 'google_oauth' }, config.jwtSecret, { expiresIn: '10m' });
}

export function verifyOauthState(state) {
  const payload = jwt.verify(String(state), config.jwtSecret);
  if (payload.purpose !== 'google_oauth') throw new Error('Invalid OAuth state');
  return payload;
}
