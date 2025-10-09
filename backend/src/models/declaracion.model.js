// backend/src/models/declaracion.model.js
const db = require('../config/database');

const Declaracion = {
    /**
     * Registra una nueva declaración y sus datos asociados.
     */
    create: async (data, idUsuarioRegistro) => {
        // Nota: Esta es una simplificación. En un proyecto real usarías transacciones.
        const correlativo = 'DUCA-' + Date.now().toString().slice(-6); 
        
        const textDeclaracion = `
            INSERT INTO siglad.declaraciones (numero_correlativo, id_usuario_registro, tipo_operacion, estado)
            VALUES ($1, $2, $3, $4)
            RETURNING id_declaracion
        `;
        const valuesDeclaracion = [correlativo, idUsuarioRegistro, data.tipoOperacion, 'PENDIENTE'];
        const resDeclaracion = await db.query(textDeclaracion, valuesDeclaracion);
        const idDeclaracion = resDeclaracion.rows[0].id_declaracion;

        const textValores = `
            INSERT INTO siglad.valores_declaracion (id_declaracion, nombre_exportador, nombre_importador, valor_aduana_total, moneda)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const valuesValores = [idDeclaracion, data.nombreExportador, data.nombreImportador, data.valorAduanaTotal, data.moneda];
        await db.query(textValores, valuesValores);

        const textTransporte = `
            INSERT INTO siglad.transporte (id_declaracion, medio_transporte, placa_vehiculo)
            VALUES ($1, $2, $3)
        `;
        const valuesTransporte = [idDeclaracion, data.medioTransporte, data.placaVehiculo];
        await db.query(textTransporte, valuesTransporte);
        
        return { id_declaracion: idDeclaracion, numero_correlativo: correlativo };
    },
    
    // ... (El resto de funciones necesarias para el CU-04 ya se proporcionó en pasos anteriores)
    
    // Función de ejemplo para evitar que el controlador falle
    findPending: async () => { return []; }, 
    updateStatusValidation: async () => { return { msg: 'OK' }; } 
};

module.exports = Declaracion;