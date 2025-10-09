// backend/src/controllers/usuario.controller.js
const UsuarioModel = require('../models/usuario.model');
const { check, validationResult } = require('express-validator');

// Reglas de validación base
const usuarioValidationRules = [
    check('nombre').not().isEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 100 }),
    check('usuario').not().isEmpty().withMessage('El nombre de usuario es obligatorio.').isLength({ min: 4, max: 50 }),
    check('rol').isIn(['ADMINISTRADOR', 'TRANSPORTISTA', 'AGENTE_ADUANERO']).withMessage('Rol inválido.'),
    check('estado').optional().isIn(['ACTIVO', 'INACTIVO']).withMessage('Estado inválido.'),
];

/**
 * GET /api/usuarios - Listar usuarios (CU-02)
 */
exports.listUsuarios = async (req, res, next) => {
    try {
        const usuarios = await UsuarioModel.findAll();
        // Ocultamos la contraseña y otros datos sensibles por seguridad
        const safeUsuarios = usuarios.map(u => ({ 
            id_usuario: u.id_usuario, 
            nombre: u.nombre, 
            usuario: u.usuario, 
            rol: u.rol, 
            estado: u.estado,
            fecha_creacion: u.fecha_creacion
        }));

        res.json({ usuarios: safeUsuarios });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/usuarios - Crear nuevo usuario (CU-02)
 */
exports.createUsuario = [
    ...usuarioValidationRules,
    check('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errores: errors.array() });
        }

        try {
            const nuevoUsuario = await UsuarioModel.create(req.body);
            res.status(201).json({ 
                msg: 'Usuario creado exitosamente.', 
                data: { id: nuevoUsuario.id_usuario, usuario: nuevoUsuario.usuario }
            });
        } catch (error) {
            // Manejo de error de usuario duplicado (ej. código 23505 en PostgreSQL)
            if (error.code === '23505') {
                 return res.status(409).json({ msg: 'El nombre de usuario o la cédula ya existen.' });
            }
            next(error);
        }
    }
];

/**
 * PUT /api/usuarios/:id - Actualizar usuario (CU-02)
 */
exports.updateUsuario = [
    ...usuarioValidationRules,
    check('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres si se va a cambiar.'),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errores: errors.array() });
        }

        try {
            const result = await UsuarioModel.update(req.params.id, req.body);
            if (!result) {
                return res.status(404).json({ msg: 'Usuario no encontrado.' });
            }
            res.json({ msg: 'Usuario actualizado exitosamente.' });
        } catch (error) {
            if (error.code === '23505') {
                 return res.status(409).json({ msg: 'El nombre de usuario ya existe.' });
            }
            next(error);
        }
    }
];

/**
 * DELETE /api/usuarios/:id - Eliminar (inactivar) usuario (CU-02)
 */
exports.deleteUsuario = async (req, res, next) => {
    try {
        const result = await UsuarioModel.remove(req.params.id);
        if (!result) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }
        res.json({ msg: 'Usuario inactivado (eliminado lógicamente) exitosamente.' });
    } catch (error) {
        next(error);
    }
};