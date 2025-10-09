// backend/src/models/declaracion.model.js
const db = require('../config/database');

const DeclaracionModel = {
    // ==========================================
    // FUNCIONES CU-03 (REGISTRO)
    // ==========================================
    create: async (data, idUsuarioRegistro) => {
        const client = await db.pool.connect(); 
        try {
            await client.query('BEGIN'); 
            const declaracionText = `
                INSERT INTO siglad.declaraciones (
                    id_usuario_registro, numero_declaracion, tipo_operacion, 
                    nombre_exportador, nombre_importador, estado_documento
                )
                VALUES ($1, $2, $3, $4, $5, $6::siglad.estado_declaracion)
                RETURNING id_declaracion, numero_declaracion, estado_documento
            `;
            const declaracionValues = [
                idUsuarioRegistro,
                data.numeroDeclaracion || `DUCA-${Date.now()}`,
                data.tipoOperacion,
                data.nombreExportador,
                data.nombreImportador,
                'PENDIENTE'
            ];
            const resDeclaracion = await client.query(declaracionText, declaracionValues);
            const idDeclaracion = resDeclaracion.rows[0].id_declaracion;
            const transporteText = `
                INSERT INTO siglad.transporte (
                    id_declaracion, medio_transporte, pais_origen,
                    placa_vehiculo, nombre_conductor, peso_bruto_kg
                )
                VALUES ($1, $2::siglad.medio_transporte, $3, $4, $5, $6)
            `;
            const transporteValues = [
                idDeclaracion,
                data.medioTransporte,
                data.paisOrigen,
                data.placaVehiculo,
                data.nombreConductor,
                data.pesoBrutoKg
            ];
            await client.query(transporteText, transporteValues);
            const valoresText = `
                INSERT INTO siglad.valores_declaracion (
                    id_declaracion, valor_aduana_total, moneda, arancel, otros_impuestos
                )
                VALUES ($1, $2, $3, $4, $5)
            `;
            const valoresValues = [
                idDeclaracion,
                data.valorAduanaTotal,
                data.moneda,
                data.arancel || 0.00,
                data.otrosImpuestos || 0.00
            ];
            await client.query(valoresText, valoresValues);
            await client.query('COMMIT'); 
            return {
                id_declaracion: idDeclaracion,
                numero_declaracion: resDeclaracion.rows[0].numero_declaracion,
                estado_documento: resDeclaracion.rows[0].estado_documento
            };
        } catch (error) {
            await client.query('ROLLBACK'); 
            throw error;
        } finally {
            client.release(); 
        }
    },
    
    // ==========================================
    // FUNCIONES CU-04 (VALIDACIÓN)
    // ==========================================
    /**
     * GET /api/validacion/pendientes: Lista todas las declaraciones en estado PENDIENTE.
     */
    findAllPendientes: async () => {
        const text = `
            SELECT 
                d.id_declaracion, d.numero_declaracion, d.tipo_operacion, d.fecha_creacion,
                u.nombre AS nombre_transportista,
                v.valor_aduana_total, t.placa_vehiculo
            FROM siglad.declaraciones d
            JOIN siglad.usuarios u ON d.id_usuario_registro = u.id_usuario
            JOIN siglad.valores_declaracion v ON d.id_declaracion = v.id_declaracion
            JOIN siglad.transporte t ON d.id_declaracion = t.id_declaracion
            WHERE d.estado_documento = 'PENDIENTE'::siglad.estado_declaracion
            ORDER BY d.fecha_creacion ASC
        `;
        const { rows } = await db.query(text);
        return rows;
    },
    
    /**
     * PUT /api/validacion/:id/aprobar|rechazar: Actualiza el estado de una declaración.
     */
    updateEstado: async (idDeclaracion, idUsuarioValidador, nuevoEstado, observaciones = null) => {
        const text = `
            UPDATE siglad.declaraciones
            SET 
                estado_documento = $1::siglad.estado_declaracion,
                id_usuario_validacion = $2,
                fecha_validacion = NOW(),
                observaciones = $3
            WHERE id_declaracion = $4
            AND estado_documento = 'PENDIENTE'::siglad.estado_declaracion
            RETURNING id_declaracion, numero_declaracion, estado_documento
        `;
        const values = [nuevoEstado, idUsuarioValidador, observaciones, idDeclaracion];
        const { rows } = await db.query(text, values);
        
        return rows[0];
    },
    
    // ==========================================
    // FUNCIONES CU-05 (CONSULTA)
    // ==========================================
    findAllByUserId: async (idUsuario) => {
        const text = `
            SELECT 
                d.id_declaracion, d.numero_declaracion, d.estado_documento, d.fecha_creacion,
                v.valor_aduana_total, t.placa_vehiculo
            FROM siglad.declaraciones d
            JOIN siglad.valores_declaracion v ON d.id_declaracion = v.id_declaracion
            JOIN siglad.transporte t ON d.id_declaracion = t.id_declaracion
            WHERE d.id_usuario_registro = $1
            ORDER BY d.fecha_creacion DESC
        `;
        const { rows } = await db.query(text, [idUsuario]);
        return rows;
    },
    
    findById: async (idDeclaracion) => {
        const text = `
            SELECT 
                d.id_declaracion, d.numero_declaracion, d.tipo_operacion, d.estado_documento, d.fecha_creacion,
                d.nombre_exportador, d.nombre_importador, d.id_usuario_registro, d.id_usuario_validacion,
                t.medio_transporte, t.pais_origen, t.placa_vehiculo, t.nombre_conductor, t.peso_bruto_kg,
                v.valor_aduana_total, v.moneda, v.arancel, v.otros_impuestos
            FROM siglad.declaraciones d
            LEFT JOIN siglad.transporte t ON d.id_declaracion = t.id_declaracion
            LEFT JOIN siglad.valores_declaracion v ON d.id_declaracion = v.id_declaracion
            WHERE d.id_declaracion = $1
        `;
        const { rows } = await db.query(text, [idDeclaracion]);
        return rows[0];
    }
};

module.exports = DeclaracionModel;