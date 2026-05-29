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

const authRoutes         = require('./routes/auth.routes');
const usuarioRoutes      = require('./routes/usuario.routes');
const tutoriaRoutes      = require('./routes/tutoria.routes');
const evidenciaRoutes    = require('./routes/evidencia.routes');
const asistenciaRoutes   = require('./routes/asistencia.routes');
const evaluacionRoutes   = require('./routes/evaluacion.routes');
const actividadRoutes    = require('./routes/actividad.routes');
const acreditacionRoutes = require('./routes/acreditacion.routes');

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

// ── Servir archivos estáticos del frontend (React) ────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Rutas de la API ───────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/usuarios',      usuarioRoutes);
app.use('/api/tutorias',      tutoriaRoutes);
app.use('/api/evidencias',    evidenciaRoutes);
app.use('/api/asistencias',   asistenciaRoutes);
app.use('/api/evaluaciones',  evaluacionRoutes);
app.use('/api/actividades',   actividadRoutes);
app.use('/api/acreditacion',  acreditacionRoutes);

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API corriendo correctamente (Supabase).' });
});

// ── Catch-all para SPA (servir index.html de React) ────────────────
app.get('/{*splat}', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Ruta de la API no encontrada.' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Manejador global de errores (SIEMPRE al final) ────────────────
app.use(errorHandler);

module.exports = app;
