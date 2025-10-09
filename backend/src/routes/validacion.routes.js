// backend/src/routes/validacion.routes.js (VERSIÓN CORRECTA)
const express = require('express');
const router = express.Router();
const validacionController = require('../controllers/validacion.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { hasRole } = require('../middleware/roles.middleware');

// Todas las rutas requieren autenticación y el rol AGENTE_ADUANERO
router.use(verifyToken);
router.use(hasRole(['AGENTE_ADUANERO'])); 

// GET /api/validacion/pendientes - Linea 13 que fallaba
router.get('/pendientes', validacionController.listPendientes); 

// PUT /api/validacion/:id/aprobar
router.put('/:id/aprobar', validacionController.aprobarDeclaracion);

// PUT /api/validacion/:id/rechazar
router.put('/:id/rechazar', validacionController.rechazarDeclaracion);

module.exports = router;