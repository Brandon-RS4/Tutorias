const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistencia.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/sesiones', protect, asistenciaController.crearSesion);
router.get('/mis-sesiones', protect, asistenciaController.listarSesionesDelTutor);
router.get('/sesiones/:sesionId/alumnos', protect, asistenciaController.obtenerAlumnosDeSesion);
router.post('/sesiones/:sesionId', protect, asistenciaController.capturarAsistencias);

module.exports = router;

