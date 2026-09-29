import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'server', 'uploads');

// Разрешённые форматы
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Уникальное имя: timestamp + случайный хеш + расширение
    const ext = path.extname(file.originalname).toLowerCase();
    const hash = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${hash}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP or GIF allowed'));
    }
    cb(null, true);
  },
});

export const UPLOADS_URL_PREFIX = '/uploads';