/**
 * controllers/auth.controller.js
 * ─────────────────────────────────────────────────────────────────
 * Login, logout y perfil propio.
 * ─────────────────────────────────────────────────────────────────
 */

const jwt     = require('jsonwebtoken');
const { Usuario } = require('../models');

// ── Helper: firmar JWT ────────────────────────────────────────────
const firmarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

// ── Helper: respuesta con token ───────────────────────────────────
const responderConToken = (res, statusCode, usuario) => {
  const token = firmarToken(usuario._id);

  // Cookie httpOnly opcional (útil si se consume desde browser)
  res.cookie('jwt', token, {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    maxAge  : 8 * 60 * 60 * 1000, // 8 h en ms
  });

  res.status(statusCode).json({
    success : true,
    token,
    data    : { usuario },
  });
};

// ─────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Correo y contraseña son obligatorios.',
      });
    }

    // Seleccionar contraseña explícitamente (select: false en el schema)
    const usuario = await Usuario.findOne({ correo }).select('+contrasena');

    if (!usuario || !(await usuario.compararContrasena(contrasena))) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta inactiva. Contacte al administrador.',
      });
    }

    // No devolver contraseña en la respuesta
    usuario.contrasena = undefined;
    responderConToken(res, 200, usuario);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  GET /api/auth/me
// ─────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).populate('departamento', 'nom_dep');
    res.status(200).json({ success: true, data: { usuario } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  POST /api/auth/logout
// ─────────────────────────────────────────────
const logout = (_req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.status(200).json({ success: true, message: 'Sesión cerrada.' });
};

module.exports = { login, getMe, logout };
