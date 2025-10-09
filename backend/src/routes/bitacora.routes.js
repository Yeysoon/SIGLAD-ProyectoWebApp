// backend/src/routes/bitacora.routes.js
const express = require('express');
const router = express.Router();
const bitacoraController = require('../controllers/bitacora.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { hasRole } = require('../middleware/roles.middleware');

// La consulta de Bitácora es exclusiva del Administrador (CU-05)
router.use(verifyToken);
router.use(hasRole(['ADMINISTRADOR']));

// GET /api/bitacora
// Nota: Aquí estamos asumiendo que ya creaste bitacora.controller.js y exportaste listAll.
router.get('/', bitacoraController.listAll); 

module.exports = router;