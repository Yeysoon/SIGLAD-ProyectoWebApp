// backend/src/controllers/bitacora.controller.js
const BitacoraModel = require('../models/bitacora.model');

/**
 * GET /api/bitacora - Listar todas las entradas de la bitácora (CU-05)
 */
exports.listAll = async (req, res, next) => {
    try {
        const logs = await BitacoraModel.findAll();
        res.json({ bitacora: logs });
    } catch (error) {
        next(error);
    }
};

// 🚨 ¡CRÍTICO: NO olvides exportar la función listAll!
// Ya está en el formato exports.listAll = ...