// backend/src/services/usuario.service.js
const UsuarioModel = require('../models/usuario.model');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

const UsuarioService = {
    getAll: async () => {
        return await UsuarioModel.findAll();
    },

    getById: async (id) => {
        return await UsuarioModel.findById(id);
    },

    create: async (data) => {
        // 1. Verificar si el usuario ya existe
        const existingUser = await UsuarioModel.findByUsername(data.usuario);
        if (existingUser) {
            throw new Error('El nombre de usuario ya está en uso.');
        }

        // 2. Hash de la contraseña (CU-02)
        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

        // 3. Crear el usuario. El Trigger de DB se encarga de la Bitácora (USUARIO_CREADO)
        return await UsuarioModel.create(data, passwordHash);
    },

    update: async (id, data) => {
        // 1. Comprobar que el usuario a modificar exista
        const existingUser = await UsuarioModel.findById(id);
        if (!existingUser) {
            throw new Error('Usuario no encontrado.');
        }

        // 2. La actualización no incluye la contraseña
        // 3. El Trigger de DB se encarga de la Bitácora (USUARIO_MODIFICADO)
        return await UsuarioModel.update(id, data);
    },

    toggleStatus: async (id, estado) => {
        const validStates = ['ACTIVO', 'INACTIVO'];
        if (!validStates.includes(estado)) {
            throw new Error('Estado inválido. Debe ser ACTIVO o INACTIVO.');
        }
        
        // El Trigger de DB maneja la Bitácora.
        return await UsuarioModel.updateStatus(id, estado);
    }
};

module.exports = UsuarioService;