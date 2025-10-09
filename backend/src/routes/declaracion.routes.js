// backend/src/routes/declaracion.routes.js
const express = require('express');
const router = express.Router();
const declaracionController = require('../controllers/declaracion.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { hasRole } = require('../middleware/roles.middleware');

// Rutas de Declaraciones solo para Transportista
router.use(verifyToken);
router.use(hasRole(['TRANSPORTISTA']));

// POST /api/declaraciones - Registrar una nueva declaración
router.post('/', declaracionController.createDeclaracion);

// GET /api/declaraciones - Listar las declaraciones del usuario
router.get('/', declaracionController.listUserDeclaraciones);

// GET /api/declaraciones/:id - Consultar una declaración específica
router.get('/:id', declaracionController.getDeclaracion);

module.exports = router; // 🚨 ¡CRÍTICO: Exportar el router!