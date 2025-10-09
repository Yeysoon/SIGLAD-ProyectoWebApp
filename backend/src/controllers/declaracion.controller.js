// backend/src/controllers/declaracion.controller.js
const DeclaracionModel = require('../models/declaracion.model');
const { check, validationResult } = require('express-validator');
const Bitacora = require('../models/bitacora.model'); // 🚨 Importar Bitácora

// Función auxiliar para obtener la IP del cliente
const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
};

/**
 * POST /api/declaraciones - Registra una declaración (CU-03)
 */
exports.createDeclaracion = [
    // ... Validaciones (se mantienen igual)
    check('nombreExportador').trim().not().isEmpty().withMessage('El nombre del exportador es requerido.'),
    check('valorAduanaTotal').isNumeric().withMessage('El valor de aduana total debe ser numérico.'),
    check('tipoOperacion').isIn(['IMPORTACION', 'EXPORTACION', 'TRANSITO']).withMessage('Tipo de operación inválido.'),
    check('medioTransporte').isIn(['TERRESTRE', 'MARITIMO', 'AEREO']).withMessage('Medio de transporte inválido.'),
    check('moneda').isLength({ min: 3, max: 3 }).withMessage('Moneda debe ser un código de 3 letras (ej. USD).'),
    
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: 'Error de validación de datos.', errores: errors.array() });
        }
        
        const idUsuarioRegistro = req.user.id; 
        const ipOrigen = getClientIp(req);

        try {
            const result = await DeclaracionModel.create(req.body, idUsuarioRegistro);
            
            // 🚨 REGISTRO EN BITÁCORA 🚨
            await Bitacora.registrar(idUsuarioRegistro, 'REGISTRO_DECLARACION', 'EXITO', 
                `Declaración DUCA N° ${result.numero_declaracion} registrada.`, 
                result.numero_declaracion, 
                ipOrigen
            );

            res.status(201).json({ 
                msg: 'Declaración DUCA registrada exitosamente.', 
                declaracion: result 
            });
        } catch (error) {
            // Manejo de errores de registro (aquí se podría registrar un FALLO en bitácora)
            if (error.code === '22P02' || error.code === '23502' || error.code === '23503') {
                 return res.status(400).json({ msg: 'Error de datos: Revise los campos ENUM y obligatorios.', detalles: error.message });
            }
            next(error);
        }
    }
];

/**
 * GET /api/declaraciones - Listar declaraciones propias (CU-05)
 */
exports.listUserDeclaraciones = async (req, res, next) => {
    const ipOrigen = getClientIp(req);
    const idUsuario = req.user.id;
    const userRole = req.user.rol;

    try {
        let declaraciones = [];

        if (userRole === 'TRANSPORTISTA') {
            declaraciones = await DeclaracionModel.findAllByUserId(idUsuario);
        } else if (userRole === 'AGENTE_ADUANERO') {
            // Para el agente, listaremos sus declaraciones (o se adaptaría a findAllPendientes)
            declaraciones = await DeclaracionModel.findAllByUserId(idUsuario); 
        }

        // 🚨 REGISTRO EN BITÁCORA 🚨
        await Bitacora.registrar(idUsuario, 'CONSULTA_DECLARACION', 'EXITO', 
            `Consulta de lista de declaraciones (${declaraciones.length} resultados) por rol ${userRole}.`, 
            null, 
            ipOrigen
        );
        
        res.json({ declaraciones });
    } catch (error) {
        // Registrar fallo de consulta
        await Bitacora.registrar(idUsuario, 'CONSULTA_DECLARACION', 'FALLO', 
            `Error al listar declaraciones.`, 
            null, 
            ipOrigen
        );
        next(error);
    }
};

/**
 * GET /api/declaraciones/:id - Consultar estado y detalle (CU-05)
 */
exports.getDeclaracion = async (req, res, next) => {
    const ipOrigen = getClientIp(req);
    const idUsuario = req.user.id;
    const { id } = req.params;

    try {
        const declaracion = await DeclaracionModel.findById(id);

        if (!declaracion) {
            await Bitacora.registrar(idUsuario, 'CONSULTA_DECLARACION', 'FALLO', 
                `Intento de consulta de DUCA ID ${id}. No encontrada.`, 
                null, 
                ipOrigen
            );
            return res.status(404).json({ msg: 'Declaración no encontrada.' });
        }

        // Seguridad: Si es TRANSPORTISTA, debe ser su propia declaración
        if (req.user.rol === 'TRANSPORTISTA' && declaracion.id_usuario_registro !== idUsuario) {
            await Bitacora.registrar(idUsuario, 'CONSULTA_DECLARACION', 'FALLO', 
                `Intento de consulta de DUCA N° ${declaracion.numero_declaracion}. Acceso denegado (no es su registro).`, 
                declaracion.numero_declaracion, 
                ipOrigen
            );
            return res.status(403).json({ msg: 'Acceso denegado. No puede consultar declaraciones de otros usuarios.' });
        }
        
        // 🚨 REGISTRO EN BITÁCORA 🚨
        await Bitacora.registrar(idUsuario, 'CONSULTA_DECLARACION', 'EXITO', 
            `Consulta de detalle de DUCA N° ${declaracion.numero_declaracion}. Estado: ${declaracion.estado_documento}.`, 
            declaracion.numero_declaracion, 
            ipOrigen
        );

        res.json({ declaracion });
    } catch (error) {
        next(error);
    }
};