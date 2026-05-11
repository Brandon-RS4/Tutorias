/**
 * routes/usuario.routes.js
 * ─────────────────────────────────────────────────────────────────
 * CU01  POST   /api/usuarios                              → registrarUsuario
 * CU03  POST   /api/usuarios/tutores/asignar              → asignarTutor
 * CU04  POST   /api/usuarios/tutorados/asignar            → asignarTutorado
 * CU11  GET    /api/usuarios/tutores                      → consultarTutoresPorCarrera
 * CU12  GET    /api/usuarios/tutores/:tutorId/tutorados   → consultarTutoradosPorTutor
 *       GET    /api/usuarios                              → listarUsuarios
 *       GET    /api/usuarios/:id                          → obtenerUsuario
 *       PATCH  /api/usuarios/:id/estado                   → cambiarEstadoUsuario
 * ─────────────────────────────────────────────────────────────────
 */

const router = require('express').Router();
const {
  registrarUsuario,
  asignarTutor,
  asignarTutorado,
  consultarTutoresPorCarrera,
  consultarTutoradosPorTutor,
  listarUsuarios,
  obtenerUsuario,
  cambiarEstadoUsuario,
} = require('../controllers/usuario.controller');

const { protect, authorize, ROLES } = require('../middlewares/auth.middleware');

// Todos los endpoints de usuarios requieren autenticación
router.use(protect);

// ─────────────────────────────────────────────
//  CU01 – Asignar (registrar) usuarios al sistema
//  Solo el Jefe de Departamento Académico puede crear usuarios
// ─────────────────────────────────────────────
router.post(
  '/',
  authorize(ROLES.JEFE_DEPTO, ROLES.DIRECTOR, ROLES.COORDINADOR_PT),
  registrarUsuario
);

// ─────────────────────────────────────────────
//  Listar y obtener usuarios (panel de administración)
//  Acceso: roles administrativos
// ─────────────────────────────────────────────
router.get(
  '/',
  authorize(
    ROLES.DIRECTOR, ROLES.SUBDIRECTOR, ROLES.JEFE_DEPTO,
    ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP
  ),
  listarUsuarios
);

router.get(
  '/:id',
  authorize(
    ROLES.DIRECTOR, ROLES.SUBDIRECTOR, ROLES.JEFE_DEPTO,
    ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP
  ),
  obtenerUsuario
);

// ─────────────────────────────────────────────
//  Activar / desactivar usuario
// ─────────────────────────────────────────────
router.patch(
  '/:id/estado',
  authorize(ROLES.JEFE_DEPTO, ROLES.DIRECTOR, ROLES.COORDINADOR_PT),
  cambiarEstadoUsuario
);

// ─────────────────────────────────────────────
//  CU03 – Asignar Tutores a grupos
//  Actor: Coordinadora Institucional de Tutorías
// ─────────────────────────────────────────────
router.post(
  '/tutores/asignar',
  authorize(ROLES.COORDINADOR_PT, ROLES.DIRECTOR),
  asignarTutor
);

// ─────────────────────────────────────────────
//  CU11 – Consultar Tutores por carrera
//  GET /api/usuarios/tutores?carrera=Sistemas
// ─────────────────────────────────────────────
router.get(
  '/tutores',
  authorize(
    ROLES.DIRECTOR, ROLES.SUBDIRECTOR, ROLES.JEFE_DEPTO,
    ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP
  ),
  consultarTutoresPorCarrera
);

// ─────────────────────────────────────────────
//  CU12 – Consultar Tutorados por Tutor
//  GET /api/usuarios/tutores/:tutorId/tutorados
// ─────────────────────────────────────────────
router.get(
  '/tutores/:tutorId/tutorados',
  authorize(
    ROLES.DIRECTOR, ROLES.SUBDIRECTOR, ROLES.JEFE_DEPTO,
    ROLES.COORDINADOR_PT, ROLES.COORDINADOR_DEP
  ),
  consultarTutoradosPorTutor
);

// ─────────────────────────────────────────────
//  CU04 – Asignar Tutorados a Tutores
//  Actor: Coordinador de Tutorías del Departamento Académico
// ─────────────────────────────────────────────
router.post(
  '/tutorados/asignar',
  authorize(ROLES.COORDINADOR_DEP, ROLES.DIRECTOR),
  asignarTutorado
);

module.exports = router;
