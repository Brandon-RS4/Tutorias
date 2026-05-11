/**
 * middlewares/upload.middleware.js
 * ─────────────────────────────────────────────────────────────────
 * Configuración de Multer para CU07 – Subir evidencias.
 * Almacena temporalmente en /uploads/ (en producción se redirige a S3).
 * ─────────────────────────────────────────────────────────────────
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Directorio local temporal
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Extensiones permitidas (CU07 flujo alterno A1)
const MIME_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (MIME_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error('Formato de archivo no permitido.'), {
        statusCode: 415,
      }),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024,
  },
});

module.exports = { upload };
