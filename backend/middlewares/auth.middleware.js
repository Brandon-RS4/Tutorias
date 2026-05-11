/**
 * middlewares/auth.middleware.js
 * ─────────────────────────────────────────────────────────────────
 * protect      → verifica JWT y adjunta req.usuario
 * authorize    → verifica que el rol del usuario esté permitido
 * ─────────────────────────────────────────────────────────────────
 */

const jwt     = require('jsonwebtoken');
const { Usuario } = require('../models');

// ── Roles válidos del sistema (deben coincidir con discriminatorKey) ──
const ROLES = {
  DIRECTOR             : 'director',
  SUBDIRECTOR          : 'subdirector',
  JEFE_DEPTO           : 'jefe_depto_academico',
  COORDINADOR_PT       : 'coordinador_pt',
  COORDINADOR_DEP      : 'coordinador_dep_ac_pt',
  TUTOR                : 'tutor',
  TUTORADO             : 'tutorado',
};

/**
 * protect
 * Valida el Bearer token JWT del header Authorization.
 * Adjunta el documento completo del usuario a req.usuario.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Token no proporcionado.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Recupera el usuario fresco desde BD (incluye contrasena: false por defecto)
    const usuario = await Usuario.findById(decoded.id).select('-contrasena');

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'El usuario del token ya no existe.',
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta inactiva. Contacte al administrador.',
      });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token expirado. Inicie sesión nuevamente.'
        : 'Token inválido.';

    return res.status(401).json({ success: false, message });
  }
};

/**
 * authorize(...roles)
 * Middleware factory que acepta uno o varios roles permitidos.
 * Uso: router.get('/ruta', protect, authorize('director', 'subdirector'), handler)
 */
const authorize = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: `El rol '${req.usuario.rol}' no tiene permiso para esta acción.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize, ROLES };
