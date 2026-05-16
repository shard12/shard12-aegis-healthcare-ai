import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const IMAGES_DIR = path.resolve(__dirname, '../../uploads/images');

try {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
} catch {
  /* startup */
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdir(IMAGES_DIR, { recursive: true }, (err) => cb(err, IMAGES_DIR));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${randomUUID()}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  const mime = String(file.mimetype || '').toLowerCase();
  if (!config.uploads.allowedMime.includes(mime)) {
    return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  }
  cb(null, true);
}

export const imageUpload = multer({
  storage,
  limits: { fileSize: config.uploads.maxBytes, files: 1 },
  fileFilter,
});
