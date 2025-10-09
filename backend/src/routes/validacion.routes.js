// backend/src/routes/validacion.routes.js
const express = require('express');
const router = express.Router();
const validacionController = require('../controllers/validacion.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { hasRole } = require('../middleware/roles.middleware');

// Todas las rutas de validación requieren ser Agente Aduanero
router.use(verifyToken);
router.use(hasRole(['AGENTE_ADUANERO']));

// GET /api/validacion/pendientes - Listar declaraciones pendientes
router.get('/pendientes', validacionController.listPendingDeclarations);

// PUT /api/validacion/:id/aprobar - Aprobar declaración
router.put('/:id/aprobar', validacionController.aprobarDeclaracion);

// PUT /api/validacion/:id/rechazar - Rechazar declaración
router.put('/:id/rechazar', validacionController.rechazarDeclaracion);

module.exports = router; // 🚨 ¡CRÍTICO: Exportar el router!