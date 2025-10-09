// backend/src/controllers/validacion.controller.js
const DeclaracionModel = require('../models/declaracion.model');
const { check, validationResult } = require('express-validator');
const Bitacora = require('../models/bitacora.model'); // Asegúrate de haber creado este modelo

// Función auxiliar para obtener la IP del cliente
const getClientIp = (req) => {
    // Manejo de x-forwarded-for (útil en entornos con proxy/load balancer) o IP directa
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
};


/**
 * GET /api/validacion/pendientes - Lista todas las declaraciones PENDIENTES (CU-04).
 * Nombre exportado: listPendientes
 */
exports.listPendientes = async (req, res, next) => {
    try {
        const declaraciones = await DeclaracionModel.findAllPendientes();
        res.json({ msg: 'Declaraciones pendientes de validación listadas.', declaraciones });
    } catch (error) {
        // En caso de error, también podríamos registrar en Bitácora
        next(error);
    }
};

/**
 * PUT /api/validacion/:id/aprobar - Aprueba una declaración (CU-04).
 * Nombre exportado: aprobarDeclaracion
 */
exports.aprobarDeclaracion = async (req, res, next) => {
    const { id } = req.params;
    const idAgente = req.user.id; 
    const ipOrigen = getClientIp(req);
    
    try {
        const resultado = await DeclaracionModel.updateEstado(id, idAgente, 'VALIDADA');

        if (!resultado) {
            return res.status(404).json({ msg: 'Declaración no encontrada o ya ha sido validada/rechazada.' });
        }
        
        await Bitacora.registrar(idAgente, 'VALIDACION_DECLARACION', 'EXITO', 
            `DUCA N° ${resultado.numero_declaracion} aprobada por Agente Aduanero.`, 
            resultado.numero_declaracion, 
            ipOrigen
        );

        res.json({ 
            msg: `Declaración ${resultado.numero_declaracion} aprobada exitosamente.`,
            declaracion: resultado
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/validacion/:id/rechazar - Rechaza una declaración (CU-04).
 * Nombre exportado: rechazarDeclaracion
 */
exports.rechazarDeclaracion = [
    check('observaciones').trim().isLength({ min: 5 }).withMessage('Las observaciones de rechazo son obligatorias y deben tener al menos 5 caracteres.'),
    
    async (req, res, next) => {
        const errors = validationResult(req); 
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: 'Error de validación de datos.', errores: errors.array() });
        }
        
        const { id } = req.params;
        const { observaciones } = req.body;
        const idAgente = req.user.id; 
        const ipOrigen = getClientIp(req);

        try {
            const resultado = await DeclaracionModel.updateEstado(id, idAgente, 'RECHAZADA', observaciones);
            
            if (!resultado) {
                return res.status(404).json({ msg: 'Declaración no encontrada o ya ha sido validada/rechazada.' });
            }

            await Bitacora.registrar(idAgente, 'RECHAZO_DECLARACION', 'EXITO', 
                `DUCA N° ${resultado.numero_declaracion} rechazada. Obs: ${observaciones.substring(0, 50)}...`, 
                resultado.numero_declaracion, 
                ipOrigen
            );

            res.json({ 
                msg: `Declaración ${resultado.numero_declaracion} rechazada exitosamente.`,
                declaracion: resultado
            });
        } catch (error) {
            next(error);
        }
    }
];