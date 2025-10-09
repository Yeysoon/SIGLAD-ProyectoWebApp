// backend/src/models/bitacora.model.js
const db = require('../config/database');

const Bitacora = {
    /**
     * Obtiene el listado completo de la bitácora desde la vista v_bitacora_legible.
     */
    findAll: async () => {
        // La vista ya hace el JOIN y ordena, como se define en tu SQL (SIGLAD_DATABASE.sql)
        const text = 'SELECT * FROM auditoria.v_bitacora_legible LIMIT 500'; 
        const { rows } = await db.query(text);
        return rows;
    }
    // ... (otras funciones log, etc.)
};

module.exports = Bitacora; // 🚨 ¡CRÍTICO: Debes exportar el objeto Bitacora!