const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividad.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// CU09 – Paso 2: Listar sesiones del tutor con sus actividades
router.get('/mis-sesiones', protect, authorize('Tutor', 'Administrador'), actividadController.listarSesionesConActividades);

// CU09 – Paso 4: Ver actividades de una sesión específica
router.get('/sesiones/:sesionId', protect, authorize('Tutor', 'Administrador'), actividadController.obtenerActividadesDeSesion);

// CU09 – Pasos 8–10: Actualizar actividad de una sesión
router.put('/sesiones/:sesionId/actividad/:actividadId', protect, authorize('Tutor', 'Administrador'), actividadController.modificarActividadSesion);

module.exports = router;
