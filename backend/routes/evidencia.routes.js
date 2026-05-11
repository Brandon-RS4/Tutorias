/**
 * routes/evidencia.routes.js
 * ─────────────────────────────────────────────────────────────────
 * CU07  POST   /api/evidencias/subir                              → subirEvidencia
 * CU06  PATCH  /api/evidencias/:id/evaluar                        → evaluarEvidencia
 * CU08  POST   /api/evidencias/tutorados/:tutoradoId/eval-final   → evaluarTutoradoFinal
 *
 *  Auxiliares:
 *       GET    /api/evidencias                                    → listarEvidencias
 *       GET    /api/evidencias/:id                                → obtenerEvidencia
 *       GET    /api/evidencias/tutorados/:tutoradoId              → historialEvidenciasTutorado
 * ─────────────────────────────────────────────────────────────────
 */

const router = require('express').Router();
const {
  subirEvidencia,
  listarEvidencias,
  obtenerEvidencia,
  evaluarEvidencia,
  evaluarTutoradoFinal,
  historialEvidenciasTutorado,
} = require('../controllers/evidencia.controller');

const { protect, authorize, ROLES }   = require('../middlewares/auth.middleware');
const { upload }                       = require('../middlewares/upload.middleware');

router.use(protect);

// ─────────────────────────────────────────────
//  CU07 – Subir evidencias
//  Actor: Tutorado
//  Multer procesa el campo "archivo" del form-data
// ─────────────────────────────────────────────
router.post(
  '/subir',
  authorize(ROLES.TUTORADO),
  upload.single('archivo'),
  subirEvidencia
);

// ── Listar evidencias (con filtros por query) ─────────────────────
router.get(
  '/',
  authorize(ROLES.TUTOR, ROLES.TUTORADO, ROLES.COORDINADOR_DEP, ROLES.COORDINADOR_PT),
  listarEvidencias
);

// ─────────────────────────────────────────────
//  Historial de evidencias de un tutorado
//  GET /api/evidencias/tutorados/:tutoradoId
//  (debe ir ANTES de /:id para no confundir el param)
// ─────────────────────────────────────────────
router.get(
  '/tutorados/:tutoradoId',
  authorize(ROLES.TUTOR, ROLES.COORDINADOR_DEP, ROLES.COORDINADOR_PT, ROLES.TUTORADO),
  historialEvidenciasTutorado
);

// ─────────────────────────────────────────────
//  CU08 – Evaluar tutorados (evaluación final del ciclo)
//  Actor: Tutor
// ─────────────────────────────────────────────
router.post(
  '/tutorados/:tutoradoId/eval-final',
  authorize(ROLES.TUTOR),
  evaluarTutoradoFinal
);

// ── Obtener evidencia por ID ──────────────────────────────────────
router.get(
  '/:id',
  authorize(ROLES.TUTOR, ROLES.TUTORADO, ROLES.COORDINADOR_DEP),
  obtenerEvidencia
);

// ─────────────────────────────────────────────
//  CU06 – Evaluar y registrar evidencias
//  Actor: Tutor
// ─────────────────────────────────────────────
router.patch(
  '/:id/evaluar',
  authorize(ROLES.TUTOR),
  evaluarEvidencia
);

module.exports = router;
