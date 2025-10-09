// backend/src/routes/declaracion.routes.js
const express = require('express');
const router = express.Router();
const declaracionController = require('../controllers/declaracion.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { hasRole } = require('../middleware/roles.middleware');

// Middleware de protección: Todas las rutas de declaraciones requieren token
router.use(verifyToken);

// ==================================================
// CU-03: Registro de Declaración (POST)
// ==================================================
router.post(
    '/', 
    hasRole(['TRANSPORTISTA']), // 🚨 Solo Transportista puede registrar
    declaracionController.createDeclaracion
);

// ==================================================
// CU-05: Consulta y Listado de Estado (GET)
// ==================================================
// Listar declaraciones propias (Transportista) o todas/pendientes (Agente)
router.get(
    '/', 
    hasRole(['TRANSPORTISTA', 'AGENTE_ADUANERO']), 
    declaracionController.listUserDeclaraciones
);

// Consultar detalle de una declaración específica
router.get(
    '/:id', 
    hasRole(['TRANSPORTISTA', 'AGENTE_ADUANERO']), 
    declaracionController.getDeclaracion
);

module.exports = router;