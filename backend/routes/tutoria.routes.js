const express = require('express');
const router = express.Router();
const tutoriaController = require('../controllers/tutoria.controller');

router.post('/planes', tutoriaController.crearPlanTutoria);
router.get('/planes', tutoriaController.listarPlanes);
router.post('/planes/:planId/actividades', tutoriaController.registrarActividad);
router.get('/planes/:planId/actividades', tutoriaController.listarActividadesPorPlan);

router.post('/grupos', tutoriaController.crearGrupo);
router.get('/grupos', tutoriaController.listarGrupos);

router.post('/tutores/asignar', tutoriaController.asignarTutor);
router.post('/tutorados/asignar', tutoriaController.asignarTutorado);

module.exports = router;
