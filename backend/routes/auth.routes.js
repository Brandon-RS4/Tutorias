/**
 * routes/auth.routes.js
 */

const router = require('express').Router();
const { login, getMe, logout } = require('../controllers/auth.controller');
const { protect }              = require('../middlewares/auth.middleware');

// POST /api/auth/login
router.post('/login', login);

// GET  /api/auth/me  (requiere token)
router.get('/me', protect, getMe);

// POST /api/auth/logout
router.post('/logout', protect, logout);

module.exports = router;
