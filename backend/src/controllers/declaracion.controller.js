// backend/src/controllers/declaracion.controller.js
const DeclaracionModel = require('../models/declaracion.model');
const { check, validationResult } = require('express-validator');

/**
 * POST /api/declaraciones - Registra una declaración (CU-03)
 */
exports.createDeclaracion = [
    // Nota: Validación simplificada para arrancar el servidor
    check('nombreExportador').not().isEmpty().withMessage('El nombre del exportador es requerido.'),
    check('valorAduanaTotal').isNumeric().withMessage('El valor de aduana debe ser numérico.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errores: errors.array() });
        }
        
        try {
            const result = await DeclaracionModel.create(req.body, req.user.id);
            res.status(201).json({ msg: 'Declaración registrada exitosamente.', data: result });
        } catch (error) {
            next(error);
        }
    }
];

/**
 * GET /api/declaraciones - Listar declaraciones propias (CU-03)
 */
exports.listUserDeclaraciones = async (req, res, next) => {
    // Implementación mínima para arrancar:
    res.json({ declaraciones: [] });
};

/**
 * GET /api/declaraciones/:id - Consultar estado (CU-03)
 */
exports.getDeclaracion = async (req, res, next) => {
    // Implementación mínima para arrancar:
    res.json({ declaracion: null });
};