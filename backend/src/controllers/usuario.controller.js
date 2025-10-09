// backend/src/controllers/usuario.controller.js
const UsuarioModel = require('../models/usuario.model');
const Bitacora = require('../models/bitacora.model'); // 🚨 Importar Bitácora
const { check, validationResult } = require('express-validator');

// Función auxiliar para obtener la IP del cliente
const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
};


// =======================================================
// GET /api/usuarios - Listar usuarios (Admin)
// =======================================================
exports.listUsuarios = async (req, res, next) => {
    const idAdmin = req.user.id;
    const ipOrigen = getClientIp(req);

    try {
        const usuarios = await UsuarioModel.findAll();
        
        // 🚨 REGISTRO EN BITÁCORA 🚨
        await Bitacora.registrar(idAdmin, 'CONSULTA_USUARIOS', 'EXITO', 
            `Listado de ${usuarios.length} usuarios del sistema.`, 
            null, ipOrigen);

        res.json({ usuarios });
    } catch (error) {
         await Bitacora.registrar(idAdmin, 'CONSULTA_USUARIOS', 'FALLO', 
            `Error al listar usuarios.`, 
            null, ipOrigen);
        next(error);
    }
};


// =======================================================
// POST /api/usuarios - Crear usuario (Admin)
// =======================================================
exports.createUsuario = [
    // Validaciones
    check('nombre').trim().not().isEmpty().withMessage('El nombre es requerido.'),
    check('correo').isEmail().withMessage('El correo no es válido.'),
    check('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    check('rol').isIn(['TRANSPORTISTA', 'AGENTE_ADUANERO', 'ADMINISTRADOR']).withMessage('Rol inválido.'),
    check('estado').isIn(['ACTIVO', 'INACTIVO']).withMessage('Estado inválido.'),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: 'Error de validación de datos.', errores: errors.array() });
        }

        const idAdmin = req.user.id;
        const ipOrigen = getClientIp(req);

        try {
            const nuevoUsuario = await UsuarioModel.create(req.body);
            
            // 🚨 REGISTRO EN BITÁCORA 🚨
            await Bitacora.registrar(idAdmin, 'USUARIO_CREADO', 'EXITO', 
                `Usuario ${nuevoUsuario.correo} (Rol: ${nuevoUsuario.rol}) creado por Admin.`, 
                null, ipOrigen);

            res.status(201).json({ msg: 'Usuario creado exitosamente.', usuario: nuevoUsuario });
        } catch (error) {
            let detalle = error.message;
             if (detalle.includes('correo electrónico ya está registrado')) {
                res.status(400).json({ msg: detalle });
            }
            
            await Bitacora.registrar(idAdmin, 'USUARIO_CREADO', 'FALLO', 
                `Fallo al crear usuario: ${detalle}.`, 
                null, ipOrigen);
            next(error);
        }
    }
];


// =======================================================
// PUT /api/usuarios/:id - Actualizar usuario (Admin)
// =======================================================
exports.updateUsuario = [
    // Validaciones (opcionales para actualización)
    check('correo').optional().isEmail().withMessage('El correo no es válido.'),
    check('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    check('rol').optional().isIn(['TRANSPORTISTA', 'AGENTE_ADUANERO', 'ADMINISTRADOR']).withMessage('Rol inválido.'),
    check('estado').optional().isIn(['ACTIVO', 'INACTIVO']).withMessage('Estado inválido.'),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: 'Error de validación de datos.', errores: errors.array() });
        }

        const { id } = req.params;
        const idAdmin = req.user.id;
        const ipOrigen = getClientIp(req);

        try {
            const usuarioActualizado = await UsuarioModel.update(id, req.body);

            if (!usuarioActualizado) {
                 await Bitacora.registrar(idAdmin, 'USUARIO_MODIFICADO', 'FALLO', 
                    `Intento de modificación de usuario ID ${id}. No encontrado.`, 
                    null, ipOrigen);
                return res.status(404).json({ msg: 'Usuario no encontrado o no hubo datos para actualizar.' });
            }

            // 🚨 REGISTRO EN BITÁCORA 🚨
            await Bitacora.registrar(idAdmin, 'USUARIO_MODIFICADO', 'EXITO', 
                `Usuario ${usuarioActualizado.correo} modificado por Admin.`, 
                null, ipOrigen);
            
            res.json({ msg: 'Usuario actualizado exitosamente.', usuario: usuarioActualizado });
        } catch (error) {
            await Bitacora.registrar(idAdmin, 'USUARIO_MODIFICADO', 'FALLO', 
                `Fallo al modificar usuario ID ${id}. Detalle: ${error.message}.`, 
                null, ipOrigen);
            next(error);
        }
    }
];


// =======================================================
// DELETE /api/usuarios/:id - Eliminar usuario (Admin)
// =======================================================
exports.deleteUsuario = async (req, res, next) => {
    const { id } = req.params;
    const idAdmin = req.user.id;
    const ipOrigen = getClientIp(req);

    try {
        const resultado = await UsuarioModel.remove(id);

        if (!resultado) {
             await Bitacora.registrar(idAdmin, 'USUARIO_ELIMINADO', 'FALLO', 
                `Intento de eliminación de usuario ID ${id}. No encontrado.`, 
                null, ipOrigen);
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }

        // 🚨 REGISTRO EN BITÁCORA 🚨
        await Bitacora.registrar(idAdmin, 'USUARIO_ELIMINADO', 'EXITO', 
            `Usuario ID ${resultado.id_usuario} eliminado por Admin.`, 
            null, ipOrigen);
        
        res.json({ msg: 'Usuario eliminado exitosamente.', id: resultado.id_usuario });
    } catch (error) {
        await Bitacora.registrar(idAdmin, 'USUARIO_ELIMINADO', 'FALLO', 
            `Fallo al eliminar usuario ID ${id}. Detalle: ${error.message}.`, 
            null, ipOrigen);
        next(error);
    }
};


// =======================================================
// GET /api/usuarios/:id - Obtener detalle (Admin)
// =======================================================
exports.getUsuario = async (req, res, next) => {
    const { id } = req.params;
    const idAdmin = req.user.id;
    const ipOrigen = getClientIp(req);

    try {
        const usuario = await UsuarioModel.findById(id);

        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }

        res.json({ usuario });
    } catch (error) {
        // En este caso no registramos FALLO en bitácora por simple consulta
        next(error);
    }
};