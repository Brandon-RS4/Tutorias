const express = require('express');
const router = express.Router();
const evaluacionController = require('../controllers/evaluacion.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// CU08 – Listar tutorados del tutor con estado de evaluación
router.get('/mis-tutorados', protect, authorize('Tutor', 'Administrador'), evaluacionController.listarTutoradosParaEvaluar);

// CU08 – Registrar / actualizar evaluación final
router.post('/tutorados/:tutoradoId', protect, authorize('Tutor', 'Administrador'), evaluacionController.evaluarTutoradoFinal);

// Consultar evaluaciones de un tutorado
router.get('/tutorados/:tutoradoId', protect, evaluacionController.obtenerEvaluacionesTutorado);

module.exports = router;
