/**
 * controllers/auth.controller.js
 * ─────────────────────────────────────────────────────────────────
 * Login, logout y perfil propio.
 * ─────────────────────────────────────────────────────────────────
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

// ── Helper: firmar JWT ────────────────────────────────────────────
const firmarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

// ── Helper: respuesta con token ───────────────────────────────────
const responderConToken = (res, statusCode, usuario) => {
  const token = firmarToken(usuario.id);

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

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('correo', correo)
      .single();

    if (error || !usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!isMatch) {
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
    delete usuario.contrasena;
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
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, correo, rol, activo, departamento_id, departamentos_academicos(nombre)')
      .eq('id', req.usuario.id)
      .single();

    if (error || !usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

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

// ─────────────────────────────────────────────
//  POST /api/auth/cambiar-contrasena-inicial
// ─────────────────────────────────────────────
const cambiarContrasenaInicial = async (req, res, next) => {
  try {
    const { correo, contrasena_actual, nueva_contrasena } = req.body;

    if (!correo || !contrasena_actual || !nueva_contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Correo, contraseña actual y nueva contraseña son obligatorios.',
      });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('correo', correo)
      .single();

    if (error || !usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const isMatch = await bcrypt.compare(contrasena_actual, usuario.contrasena);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta.' });
    }

    if (!usuario.primer_inicio_sesion) {
      return res.status(400).json({ success: false, message: 'La contraseña inicial ya fue cambiada anteriormente.' });
    }

    const hashedPassword = await bcrypt.hash(nueva_contrasena, 12);

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        contrasena: hashedPassword,
        primer_inicio_sesion: false
      })
      .eq('id', usuario.id);

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    res.status(200).json({ success: true, message: 'Contraseña cambiada exitosamente. Por favor inicie sesión.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, logout, cambiarContrasenaInicial };
