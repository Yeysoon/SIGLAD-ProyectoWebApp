// backend/src/models/usuario.model.js
const db = require('../config/database');
const bcrypt = require('bcrypt');
const saltRounds = 10; // Para hashear contraseñas

const Usuario = {
    /**
     * Busca un usuario por su nombre de usuario para el login (CU-01).
     */
    findByUsername: async (usuario) => {
        const text = 'SELECT id_usuario, usuario, password_hash, rol, estado FROM siglad.usuarios WHERE usuario = $1';
        const { rows } = await db.query(text, [usuario]);
        if (!rows.length) return null;
        // Mapear password_hash a password para el controller
        return {
            id_usuario: rows[0].id_usuario,
            usuario: rows[0].usuario,
            password_hash: rows[0].password_hash,
            rol: rows[0].rol,
            estado: rows[0].estado,
        };
    },

    /**
     * Lista todos los usuarios (CU-02).
     */
    findAll: async () => {
        const text = 'SELECT id_usuario, nombre, usuario, rol, estado, fecha_creacion FROM siglad.usuarios ORDER BY nombre ASC';
        const { rows } = await db.query(text);
        return rows;
    },

    /**
     * Crea un nuevo usuario (CU-02).
     */
    create: async (data) => {
        const hash = await bcrypt.hash(data.password, saltRounds);
        const text = `
            INSERT INTO siglad.usuarios (nombre, usuario, password_hash, rol, estado)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id_usuario, usuario, rol, estado, fecha_creacion
        `;
        const values = [data.nombre, data.usuario, hash, data.rol, data.estado || 'ACTIVO'];
        const { rows } = await db.query(text, values);
        return rows[0];
    },

    /**
     * Actualiza un usuario existente (CU-02).
     */
    update: async (idUsuario, data) => {
        let hash = null;
        let text = 'UPDATE siglad.usuarios SET nombre = $1, usuario = $2, rol = $3, estado = $4 WHERE id_usuario = $5 RETURNING id_usuario';
        let values = [data.nombre, data.usuario, data.rol, data.estado, idUsuario];

        if (data.password) {
            // Si se proporciona una nueva contraseña, la hasheamos
            hash = await bcrypt.hash(data.password, saltRounds);
            text = 'UPDATE siglad.usuarios SET nombre = $1, usuario = $2, password_hash = $3, rol = $4, estado = $5 WHERE id_usuario = $6 RETURNING id_usuario';
            values = [data.nombre, data.usuario, hash, data.rol, data.estado, idUsuario];
        }

        const { rows } = await db.query(text, values);
        return rows.length > 0;
    },

    /**
     * Elimina/Inactiva un usuario (CU-02).
     */
    remove: async (idUsuario) => {
        // En lugar de DELETE, actualizamos el estado a INACTIVO
        const text = 'UPDATE siglad.usuarios SET estado = \'INACTIVO\' WHERE id_usuario = $1 RETURNING id_usuario';
        const { rows } = await db.query(text, [idUsuario]);
        return rows.length > 0;
    }
};

module.exports = Usuario;