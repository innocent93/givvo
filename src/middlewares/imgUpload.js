// @ts-nocheck
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

/* ── make sure ./tmp exists ─────────────────────────────────────────── */
const tmpDir = path.join(process.cwd(), 'tmp'); // e.g. C:\Users\...\tech\tmp
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname)); // 1751920871702-110456120.jpg
  },
});

function imageFilter(req, file, cb) {
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
}

export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('img');

export const uploadPhoto = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('photo');
