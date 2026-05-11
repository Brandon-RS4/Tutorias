/**
 * src/app.js
 * ─────────────────────────────────────────────────────────────────
 * Configuración central de Express.
 * ─────────────────────────────────────────────────────────────────
 */

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');

const authRoutes      = require('./routes/auth.routes');
const usuarioRoutes   = require('./routes/usuario.routes');
const tutoriaRoutes   = require('./routes/tutoria.routes');
const evidenciaRoutes = require('./routes/evidencia.routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// ── Seguridad y parsers ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin     : process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Servir archivos subidos (evidencias) ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Rutas de la API ───────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/usuarios',   usuarioRoutes);
app.use('/api/tutorias',   tutoriaRoutes);
app.use('/api/evidencias', evidenciaRoutes);

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API corriendo correctamente.' });
});

// ── Ruta no encontrada ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada.' });
});

// ── Manejador global de errores (SIEMPRE al final) ────────────────
app.use(errorHandler);

module.exports = app;
