/**
 * middlewares/auth.middleware.js
 * ─────────────────────────────────────────────────────────────────
 * protect      → verifica JWT y adjunta req.usuario
 * authorize    → verifica que el rol del usuario esté permitido
 * ─────────────────────────────────────────────────────────────────
 */

const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// ── Roles válidos del sistema ──
const ROLES = {
  ADMINISTRADOR: 'Administrador',
  DIRECTOR: 'Director',
  SUBDIRECTOR: 'Subdirector',
  TUTOR: 'Tutor',
  TUTORADO: 'Tutorado',
  JEFE_DEPARTAMENTO_ACADEMICO: 'Jefe_Departamento_Academico',
  COORDINADOR_INSTITUCIONAL_PT: 'Coordinador_Institucional_PT',
  COORDINADOR_DEPARTAMENTO_ACADEMICO: 'Coordinador_Departamento_Academico',
  JEFE_DEPARTAMENTO_DESARROLLO_ACADEMICO: 'Jefe_Departamento_Desarrollo_Academico'
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

    // Recupera el usuario fresco desde BD
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, correo, rol, activo, departamento_id')
      .eq('id', decoded.id)
      .single();

    if (error || !usuario) {
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
 * Uso: router.get('/ruta', protect, authorize('Director', 'Subdirector'), handler)
 */
const authorize = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (req.usuario.rol === 'Administrador') {
      return next(); // El administrador tiene acceso a todo
    }

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
