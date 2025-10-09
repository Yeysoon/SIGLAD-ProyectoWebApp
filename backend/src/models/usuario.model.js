// backend/src/models/usuario.model.js
const db = require('../config/database');
const bcrypt = require('bcrypt');
const saltRounds = 10; // Para hashear contraseñas

const Usuario = {
    /**
     * Busca un usuario por su CORREO para el login (CU-01).
     * El parámetro 'loginValue' es el correo que el usuario intenta usar.
     */
    findByUsername: async (loginValue) => {
        const text = `
            SELECT id_usuario, nombre, correo, password_hash, rol, estado 
            FROM siglad.usuarios 
            WHERE correo = $1
        `;
        const { rows } = await db.query(text, [loginValue]);
        if (!rows.length) return null;
        
        // El controller espera estos campos para validar el login y generar el token
        return {
            id: rows[0].id_usuario, // Usamos 'id' para que el payload JWT sea más limpio
            usuario: rows[0].correo, // Usamos el correo como nombre de usuario para el token
            password_hash: rows[0].password_hash,
            rol: rows[0].rol,
            estado: rows[0].estado,
            nombre: rows[0].nombre // Incluimos el nombre para el objeto de respuesta
        };
    },

    /**
     * Lista todos los usuarios (CU-02).
     */
    findAll: async () => {
        // Se selecciona 'correo' en lugar de 'usuario'
        const text = 'SELECT id_usuario, nombre, correo, rol, estado, fecha_creacion FROM siglad.usuarios ORDER BY nombre ASC';
        const { rows } = await db.query(text);
        return rows;
    },

    /**
     * Crea un nuevo usuario (CU-02).
     */
    create: async (data) => {
        const hash = await bcrypt.hash(data.password, saltRounds);
        const text = `
            INSERT INTO siglad.usuarios (nombre, correo, password_hash, rol, estado)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id_usuario, nombre, correo, rol, estado, fecha_creacion
        `;
        // data.usuario fue reemplazado por data.correo en el array de values
        const values = [data.nombre, data.correo, hash, data.rol, data.estado || 'ACTIVO'];
        const { rows } = await db.query(text, values);
        return rows[0];
    },

    /**
     * Actualiza un usuario existente (CU-02).
     */
    update: async (idUsuario, data) => {
        let hash = null;
        let text = 'UPDATE siglad.usuarios SET nombre = $1, correo = $2, rol = $3, estado = $4 WHERE id_usuario = $5 RETURNING id_usuario';
        let values = [data.nombre, data.correo, data.rol, data.estado, idUsuario];

        if (data.password) {
            hash = await bcrypt.hash(data.password, saltRounds);
            // Si hay contraseña, se agrega el password_hash a la consulta
            text = 'UPDATE siglad.usuarios SET nombre = $1, correo = $2, password_hash = $3, rol = $4, estado = $5 WHERE id_usuario = $6 RETURNING id_usuario';
            values = [data.nombre, data.correo, hash, data.rol, data.estado, idUsuario];
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