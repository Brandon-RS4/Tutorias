/**
 * middlewares/error.middleware.js
 * ─────────────────────────────────────────────────────────────────
 * Manejador global de errores.  Se registra DESPUÉS de todas las
 * rutas en app.js con: app.use(errorHandler)
 * ─────────────────────────────────────────────────────────────────
 */

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Error interno del servidor';

  // ── Mongoose: ID con formato inválido ────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `ID inválido: ${err.value}`;
  }

  // ── Mongoose: campo único duplicado ──────────
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    statusCode  = 409;
    message     = `Ya existe un registro con ese valor en el campo '${campo}'.`;
  }

  // ── Mongoose: validación de esquema ──────────
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message    = Object.values(err.errors)
      .map((e) => e.message)
      .join('. ');
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success : false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
