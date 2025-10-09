// backend/src/controllers/usuario.controller.js
const Usuario = require('../models/usuario.model');
// Se recomienda usar express-validator para validar los datos, pero lo omitimos por ahora.

/**
 * GET /api/usuarios - Lista todos los usuarios (CU-02).
 */
exports.listUsuarios = async (req, res, next) => {
    try {
        const usuarios = await Usuario.findAll();
        res.json(usuarios);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/usuarios - Crea un nuevo usuario (CU-02).
 * Es vital para que el hash de la contraseña sea correcto.
 */
exports.createUsuario = async (req, res, next) => {
    try {
        // La validación de campos obligatorios (nombre, correo, password, rol)
        // debe hacerse aquí con express-validator.
        
        const data = req.body;
        
        // 🚨 Importante: El modelo espera 'correo' y 'password' para hashear
        if (!data.correo || !data.password || !data.nombre || !data.rol) {
             return res.status(400).json({ msg: 'Faltan campos obligatorios para crear el usuario (nombre, correo, password, rol).' });
        }
        
        const nuevoUsuario = await Usuario.create(data);

        // Limpiar la respuesta para no devolver el hash de la contraseña
        const { password_hash, ...usuarioLimpio } = nuevoUsuario; 

        res.status(201).json({ 
            msg: 'Usuario creado exitosamente. Ya puedes iniciar sesión con este usuario.', 
            usuario: usuarioLimpio 
        });
    } catch (error) {
        // Manejar error de conflicto (ej. correo ya existe)
        if (error.code === '23505') { 
            return res.status(409).json({ msg: 'El correo electrónico ya está registrado.' });
        }
        next(error); 
    }
};

/**
 * PUT /api/usuarios/:id - Actualiza un usuario existente (CU-02).
 */
exports.updateUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        const actualizado = await Usuario.update(id, data);

        if (actualizado) {
            res.json({ msg: `Usuario con ID ${id} actualizado correctamente.` });
        } else {
            res.status(404).json({ msg: 'Usuario no encontrado.' });
        }
    } catch (error) {
        if (error.code === '23505') { 
            return res.status(409).json({ msg: 'El correo electrónico ya está registrado en otro usuario.' });
        }
        next(error);
    }
};

/**
 * DELETE /api/usuarios/:id - Elimina/Inactiva un usuario (CU-02).
 */
exports.deleteUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // La lógica en el modelo lo marca como INACTIVO en lugar de eliminar
        const inactivado = await Usuario.remove(id);

        if (inactivado) {
            res.json({ msg: `Usuario con ID ${id} inactivado correctamente.` });
        } else {
            res.status(404).json({ msg: 'Usuario no encontrado.' });
        }
    } catch (error) {
        next(error);
    }
};