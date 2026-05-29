const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

const { protect } = require('../middlewares/auth.middleware');

router.post('/', protect, usuarioController.registrarUsuario);
router.get('/tutores', usuarioController.consultarTutoresPorCarrera);
router.get('/tutores/:tutorId/tutorados', usuarioController.consultarTutoradosPorTutor);
router.get('/tutorados', usuarioController.listarTutorados);
router.get('/', usuarioController.listarUsuarios);
router.get('/:id', usuarioController.obtenerUsuario);
router.patch('/:id/estado', usuarioController.cambiarEstadoUsuario);

module.exports = router;
