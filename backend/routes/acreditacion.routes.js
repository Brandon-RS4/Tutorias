const express = require('express');
const router = express.Router();
const acreditacionController = require('../controllers/acreditacion.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// CU10 – Obtener grupos para acreditación
router.get('/grupos', protect, authorize('Coordinador_Institucional_PT', 'Administrador'), acreditacionController.obtenerGruposParaAcreditacion);

// 2. Consultar Tutorados de un Grupo Activo
router.get('/grupos/:grupoId/tutorados', protect, authorize('Coordinador_Institucional_PT', 'Administrador'), acreditacionController.obtenerTutoradosParaConstancia);

// 3. Generar Constancia (Liberación) para un Tutorado específico
router.post('/:tutoradoId/plan/:planId', protect, authorize('Coordinador_Institucional_PT', 'Administrador'), acreditacionController.generarFormatoAcreditacion);

module.exports = router;
