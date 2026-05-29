const express = require('express');
const router = express.Router();
const evidenciaController = require('../controllers/evidencia.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware'); // MIME + tamaño validados (A1, A2)

// CU07 – Portal del Tutorado: ver actividades disponibles de su grupo
router.get('/mis-actividades', protect, authorize('Tutorado'), evidenciaController.listarActividadesDelTutorado);

// CU07 – Portal del Tutorado: ver sus propias evidencias entregadas
router.get('/mis-evidencias', protect, authorize('Tutorado'), evidenciaController.listarMisEvidencias);

// CU07 – Subir evidencia (Tutorado). upload.middleware valida formato (A1) y tamaño (A2)
router.post('/subir', protect, authorize('Tutorado'), upload.single('archivo'), evidenciaController.subirEvidencia);

// CU06 – Evaluar evidencia (Tutor / Admin)
router.patch('/:id/evaluar', protect, authorize('Tutor', 'Administrador'), evidenciaController.evaluarEvidencia);

// Listar y obtener (Tutor ve las de sus tutorados; Admin ve todo)
router.get('/', protect, evidenciaController.listarEvidencias);
router.get('/:id', protect, evidenciaController.obtenerEvidencia);

module.exports = router;
