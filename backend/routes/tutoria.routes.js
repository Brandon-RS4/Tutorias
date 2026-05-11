/**
 * routes/tutoria.routes.js
 * ─────────────────────────────────────────────────────────────────
 * CU02  POST  /api/tutorias/planes/:planId/actividades         → registrarActividad
 * CU05  POST  /api/tutorias/sesiones/:sesionId/asistencias     → capturarAsistencias
 * CU09  PUT   /api/tutorias/sesiones/:sesionId/actividades/:id → modificarActividadSesion
 * CU10  POST  /api/tutorias/acreditacion/:tutoradoId/plan/:id  → generarFormatoAcreditacion
 *
 *  Auxiliares:
 *       POST  /api/tutorias/planes                             → crearPlanTutoria
 *       GET   /api/tutorias/planes                             → listarPlanes
 *       POST  /api/tutorias/grupos                             → crearGrupo
 *       POST  /api/tutorias/grupos/:grupoId/sesiones           → crearSesion
 *       GET   /api/tutorias/grupos/:grupoId/sesiones           → listarSesionesPorGrupo
 *       GET   /api/tutorias/acreditacion/:formatoId            → obtenerFormatoAcreditacion
 * ─────────────────────────────────────────────────────────────────
 */

const router = require('express').Router();
const {
  registrarActividad,
  crearPlanTutoria,
  listarPlanes,
  crearGrupo,
  listarGrupos,
  capturarAsistencias,
  listarSesionesPorGrupo,
  crearSesion,
  modificarActividadSesion,
  generarFormatoAcreditacion,
  obtenerFormatoAcreditacion,
} = require('../controllers/tutoria.controller');

const { protect, authorize, ROLES } = require('../middlewares/auth.middleware');

router.use(protect);

// ── Planes de Tutoría ─────────────────────────────────────────────
router.post(
  '/planes',
  authorize(ROLES.COORDINADOR_PT, ROLES.DIRECTOR),
  crearPlanTutoria
);

router.get(
  '/planes',
  authorize(
    ROLES.DIRECTOR, ROLES.SUBDIRECTOR, ROLES.JEFE_DEPTO,
    ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP, ROLES.TUTOR
  ),
  listarPlanes
);

// ─────────────────────────────────────────────
//  CU02 – Asignar actividades al Plan de Tutorías
//  Actor: Coordinador Institucional de Tutorías
// ─────────────────────────────────────────────
router.post(
  '/planes/:planId/actividades',
  authorize(ROLES.COORDINADOR_PT, ROLES.DIRECTOR),
  registrarActividad
);

// ── Grupos ────────────────────────────────────────────────────────
router.post(
  '/grupos',
  authorize(ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP, ROLES.DIRECTOR),
  crearGrupo
);

router.get(
  '/grupos',
  authorize(
    ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP, ROLES.DIRECTOR, 
    ROLES.JEFE_DEPTO, ROLES.SUBDIRECTOR
  ),
  listarGrupos
);

// ── Sesiones ──────────────────────────────────────────────────────
router.post(
  '/grupos/:grupoId/sesiones',
  authorize(ROLES.TUTOR, ROLES.COORDINADOR_PT, ROLES.DIRECTOR),
  crearSesion
);

router.get(
  '/grupos/:grupoId/sesiones',
  authorize(
    ROLES.TUTOR, ROLES.TUTORADO,
    ROLES.DIRECTOR, ROLES.SUBDIRECTOR,
    ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP, ROLES.JEFE_DEPTO
  ),
  listarSesionesPorGrupo
);

// ─────────────────────────────────────────────
//  CU05 – Capturar Asistencias
//  Actor: Tutor
// ─────────────────────────────────────────────
router.post(
  '/sesiones/:sesionId/asistencias',
  authorize(ROLES.TUTOR, ROLES.DIRECTOR),
  capturarAsistencias
);

// ─────────────────────────────────────────────
//  CU09 – Modificar actividades propuestas para las sesiones
//  Actor: Tutor
// ─────────────────────────────────────────────
router.put(
  '/sesiones/:sesionId/actividades/:actividadId',
  authorize(ROLES.TUTOR, ROLES.DIRECTOR),
  modificarActividadSesion
);

// ─────────────────────────────────────────────
//  CU10 – Generar formato de acreditación
//  Actor: Coordinador Departamental
// ─────────────────────────────────────────────
router.post(
  '/acreditacion/:tutoradoId/plan/:planId',
  authorize(ROLES.COORDINADOR_DEP, ROLES.DIRECTOR),
  generarFormatoAcreditacion
);

router.get(
  '/acreditacion/:formatoId',
  authorize(
    ROLES.DIRECTOR, ROLES.SUBDIRECTOR, ROLES.JEFE_DEPTO,
    ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP
  ),
  obtenerFormatoAcreditacion
);

module.exports = router;
