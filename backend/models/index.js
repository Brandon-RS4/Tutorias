/**
 * models/index.js
 * ─────────────────────────────────────────────────────────────────
 * Punto único de importación para todos los modelos Mongoose.
 * Uso en controllers:
 *   const { Tutor, Tutorado, PlanTutoria } = require('../models');
 * ─────────────────────────────────────────────────────────────────
 */

const {
  Usuario,
  Director,
  Subdirector,
  JefeDeptoAcademico,
  CoordinadorPT,
  CoordinadorDepAcPT,
  Tutor,
  Tutorado,
} = require('./Usuario.model');

const { Tecnm, DepAcademico }           = require('./Institucion.model');
const { PlanTutoria, Actividad }        = require('./PlanTutoria.model');
const { Grupo, Sesion }                 = require('./Grupo.model');
const { Evidencia }                     = require('./Evidencia.model');
const { Asistencia }                    = require('./Asistencia.model');
const { FormatoAcreditacion }           = require('./FormatoAcreditacion.model');

module.exports = {
  // ── Institución ──────────────────────────
  Tecnm,
  DepAcademico,

  // ── Usuarios (base + discriminadores) ────
  Usuario,
  Director,
  Subdirector,
  JefeDeptoAcademico,
  CoordinadorPT,
  CoordinadorDepAcPT,
  Tutor,
  Tutorado,

  // ── Plan y actividades ───────────────────
  PlanTutoria,
  Actividad,

  // ── Grupos y sesiones ────────────────────
  Grupo,
  Sesion,

  // ── Operativas ───────────────────────────
  Evidencia,
  Asistencia,
  FormatoAcreditacion,
};
