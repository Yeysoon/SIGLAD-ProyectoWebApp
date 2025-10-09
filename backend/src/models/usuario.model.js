// backend/src/models/usuario.model.js
const db = require('../config/database');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10; 

const UsuarioModel = {
    // CU-01: Buscar usuario por nombre/correo para login
    findByUsername: async (usuario) => {
        const text = `
            SELECT id_usuario as id, nombre, correo, password_hash, rol::text, estado::text
            FROM siglad.usuarios 
            WHERE correo = $1
        `;
        const { rows } = await db.query(text, [usuario]);
        return rows[0];
    },

    // CU-02: Listar todos los usuarios
    findAll: async () => {
        const text = `
            SELECT id_usuario as id, nombre, correo, rol::text, estado::text, fecha_creacion
            FROM siglad.usuarios
            ORDER BY id_usuario ASC
        `;
        const { rows } = await db.query(text);
        return rows;
    },

    // CU-02: Buscar usuario por ID
    findById: async (id) => {
        const text = `
            SELECT id_usuario as id, nombre, correo, rol::text, estado::text, fecha_creacion
            FROM siglad.usuarios 
            WHERE id_usuario = $1
        `;
        const { rows } = await db.query(text, [id]);
        return rows[0];
    },

    // CU-02: Crear nuevo usuario (usado por Admin)
    create: async ({ nombre, correo, password, rol, estado }) => {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        
        // El rol y el estado deben coincidir con los ENUMs de PostgreSQL
        const text = `
            INSERT INTO siglad.usuarios (nombre, correo, password_hash, rol, estado)
            VALUES ($1, $2, $3, $4::siglad.rol_usuario, $5::siglad.estado_usuario)
            RETURNING id_usuario as id, nombre, correo, rol::text, estado::text
        `;
        const values = [nombre, correo, passwordHash, rol, estado];
        
        try {
            const { rows } = await db.query(text, values);
            return rows[0];
        } catch (error) {
            // Manejar error de correo duplicado (PostgreSQL code 23505)
            if (error.code === '23505') {
                throw new Error('El correo electrónico ya está registrado.');
            }
            throw error;
        }
    },

    // CU-02: Actualizar usuario
    update: async (id, data) => {
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (data.nombre) { updates.push(`nombre = $${paramCount++}`); values.push(data.nombre); }
        if (data.correo) { updates.push(`correo = $${paramCount++}`); values.push(data.correo); }
        if (data.rol) { updates.push(`rol = $${paramCount++}::siglad.rol_usuario`); values.push(data.rol); }
        if (data.estado) { updates.push(`estado = $${paramCount++}::siglad.estado_usuario`); values.push(data.estado); }
        
        if (data.password) {
            const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
            updates.push(`password_hash = $${paramCount++}`);
            values.push(passwordHash);
        }

        if (updates.length === 0) {
            return null; // Nada que actualizar
        }

        values.push(id);
        const text = `
            UPDATE siglad.usuarios
            SET ${updates.join(', ')}
            WHERE id_usuario = $${paramCount}
            RETURNING id_usuario as id, nombre, correo, rol::text, estado::text
        `;

        const { rows } = await db.query(text, values);
        return rows[0];
    },

    // CU-02: Eliminar usuario
    remove: async (id) => {
        const text = `
            DELETE FROM siglad.usuarios 
            WHERE id_usuario = $1
            RETURNING id_usuario
        `;
        const { rows } = await db.query(text, [id]);
        return rows[0];
    }
};

module.exports = UsuarioModel;