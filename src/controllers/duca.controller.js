import { pool } from '../db/pool.js';
import { validateDUCA } from '../validators/duca.validator.js';

// Funciones utilitarias
function getUsername(req) {
  return req.user?.usuario || req.user?.id || 'UsuarioAnónimo';
}
function getClientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '').toString();
}
function getUA(req) {
  return (req.headers['user-agent'] || '').toString();
}

// POST /api/duca/recepcion
export async function recepcionDUCA(req, res) {
  const client = await pool.connect();
  const ip = getClientIp(req);
  const ua = getUA(req);
  const userId = req.user.id;
  const username = getUsername(req);

  try {
    console.log('📥 Recibiendo DUCA - Body:', JSON.stringify(req.body, null, 2));
    
    const { ok, errors, data } = validateDUCA(req.body);
    
    console.log('✅ Resultado validación:', { ok, errors, data: data ? 'Presente' : 'Ausente' });
    
    if (!ok) {
      await pool.query(
        `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, numero_declaracion, notes)
         VALUES ($1, $2, $3, $4, 'DECLARATION_CREATE', 'FALLO', $5, $6)`,
        [userId, username, ip, ua, req.body?.duca?.numeroDocumento ?? null, `Validación: ${errors.join('; ')}`]
      );
      return res.status(400).json({ ok: false, error: 'Verifique los campos obligatorios', details: errors });
    }

    await client.query('BEGIN');

    const exists = await client.query(
      `SELECT 1 FROM public.duca_declarations WHERE numero_documento = $1 LIMIT 1`,
      [data.numero_documento]
    );
    
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      await pool.query(
        `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, numero_declaracion, notes)
         VALUES ($1, $2, $3, $4, 'DECLARATION_CREATE', 'FALLO', $5, 'DUCA ya registrada')`,
        [userId, username, ip, ua, data.numero_documento]
      );
      return res.status(409).json({ ok: false, error: 'DUCA ya registrada' });
    }

    // ✅ INSERT COMPLETO CON TODOS LOS CAMPOS
    const insertSQL = `
      INSERT INTO public.duca_declarations (
        numero_documento, fecha_emision, pais_emisor, tipo_operacion,
        id_exportador, nombre_exportador, direccion_exportador, telefono_exportador, email_exportador,
        id_importador, nombre_importador, direccion_importador, telefono_importador, email_importador,
        medio_transporte, placa_vehiculo, nombre_conductor, licencia_conductor, pais_licencia,
        aduana_salida, aduana_entrada, pais_destino, km_aproximados,
        valor_factura, gastos_transporte, seguro, otros_gastos, valor_aduana_total, moneda,
        selectivo_codigo, selectivo_descripcion,
        estado_documento, firma_electronica,
        created_by_user_id
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29,
        $30, $31,
        $32, $33,
        $34
      ) RETURNING id
    `;

    const values = [
      data.numero_documento, data.fecha_emision, data.pais_emisor, data.tipo_operacion,
      data.id_exportador, data.nombre_exportador, data.direccion_exportador, data.telefono_exportador, data.email_exportador,
      data.id_importador, data.nombre_importador, data.direccion_importador, data.telefono_importador, data.email_importador,
      data.medio_transporte, data.placa_vehiculo, data.nombre_conductor, data.licencia_conductor, data.pais_licencia,
      data.aduana_salida, data.aduana_entrada, data.pais_destino, data.km_aproximados,
      data.valor_factura, data.gastos_transporte, data.seguro, data.otros_gastos, data.valor_aduana_total, data.moneda,
      data.selectivo_codigo, data.selectivo_descripcion,
      'PENDIENTE', data.firma_electronica,
      userId
    ];

    console.log('💾 Insertando declaración con valores:', values);

    const cab = await client.query(insertSQL, values);
    const ducaId = cab.rows[0].id;

    console.log('✅ DUCA insertada con ID:', ducaId);

    // Insertar items
    const items = data.items;
    if (items && items.length > 0) {
      const itemValues = [];
      const itemParams = [];
      let paramIndex = 1;
      
      for (const it of items) {
        itemParams.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        itemValues.push(
          ducaId, 
          it.linea, 
          it.descripcion, 
          it.cantidad, 
          it.unidadMedida, 
          it.valorUnitario, 
          it.paisOrigen
        );
      }
      
      await client.query(
        `INSERT INTO public.duca_items (duca_id, linea, descripcion, cantidad, unidad_medida, valor_unitario, pais_origen)
         VALUES ${itemParams.join(', ')}`,
        itemValues
      );
      
      console.log(`✅ ${items.length} items insertados`);
    }

    await client.query('COMMIT');
    
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, numero_declaracion, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_CREATE', 'EXITO', $5, 'Declaración guardada con estado PENDIENTE')`,
      [userId, username, ip, ua, data.numero_documento]
    );
    
    console.log('✅ Declaración registrada exitosamente:', data.numero_documento);
    
    return res.status(201).json({
      ok: true,
      message: 'Declaración registrada correctamente',
      numero: data.numero_documento,
      estado: 'PENDIENTE',
      id: ducaId
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en recepcionDUCA:', err);
    console.error('❌ Stack:', err.stack);
    
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, numero_declaracion, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_CREATE', 'FALLO', $5, $6)`,
      [userId, username, ip, ua, req.body?.duca?.numeroDocumento ?? null, err.message || 'Error 500']
    );
    
    return res.status(500).json({ ok: false, error: 'Error al registrar la declaración', details: err.message });
  } finally {
    client.release();
  }
}

// GET /api/duca/declarations/pending
export async function getPendingDeclarations(req, res) {
  const ip = getClientIp(req);
  const ua = getUA(req);
  const userId = req.user.id;
  const username = getUsername(req);

  try {
    const q = `
      SELECT 
          numero_documento AS "numeroDocumento", 
          fecha_emision AS "fechaEmision", 
          pais_emisor AS "paisEmisor", 
          tipo_operacion AS "tipoOperacion", 
          nombre_exportador AS "nombreExportador", 
          nombre_importador AS "nombreImportador", 
          medio_transporte AS "medioTransporte", 
          valor_aduana_total AS "valorAduanaTotal", 
          moneda, 
          estado_documento AS "estadoDocumento"
      FROM 
          public.duca_declarations 
      WHERE 
          estado_documento = 'PENDIENTE'
      ORDER BY 
          fecha_emision ASC
    `;
    const { rows } = await pool.query(q);
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_PENDING_QUERY', 'EXITO', $5)`,
      [userId, username, ip, ua, `El agente ${username} consultó ${rows.length} declaraciones pendientes.`]
    );
    return res.status(200).json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error en getPendingDeclarations:', err);
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_PENDING_QUERY', 'FALLO', $5)`,
      [userId, username, ip, ua, err.message || 'Error en consulta pendientes']
    );
    return res.status(500).json({ ok: false, error: 'Error de servidor. Intente de nuevo más tarde.' });
  }
}

// POST /api/duca/declarations/validate
export async function validateDeclaration(req, res) {
  const client = await pool.connect();
  const { numeroDocumento, nuevoEstado, comentarios } = req.body ?? {};
  const userId = req.user.id;
  const username = getUsername(req);
  const ip = getClientIp(req);
  const ua = getUA(req);

  console.log('Validación iniciada - Datos recibidos:', { numeroDocumento, nuevoEstado, comentarios, userId });

  if (!numeroDocumento || !nuevoEstado) {
    return res.status(400).json({ ok: false, error: 'Número de documento y estado de validación son requeridos.' });
  }

  const finalEstado = nuevoEstado.toUpperCase();
  if (!['VALIDADA', 'RECHAZADA'].includes(finalEstado)) {
    return res.status(400).json({ ok: false, error: 'El estado debe ser VALIDADA o RECHAZADA.' });
  }

  try {
    await client.query('BEGIN');

    const updateQ = `
      UPDATE public.duca_declarations 
      SET 
          estado_documento = $1, 
          fecha_validacion = NOW(), 
          agente_validador_id = $2,
          notas_validacion = $3
      WHERE 
          numero_documento = $4 
          AND estado_documento = 'PENDIENTE'
      RETURNING id
    `;
    const result = await client.query(updateQ, [finalEstado, userId, comentarios || null, numeroDocumento]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      await pool.query(
        `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, numero_declaracion, notes)
         VALUES ($1, $2, $3, $4, 'DECLARATION_VALIDATE', 'FALLO', $5, 'DUCA no encontrada o no estaba PENDIENTE')`,
        [userId, username, ip, ua, numeroDocumento]
      );
      return res.status(404).json({ ok: false, error: 'Declaración no encontrada o ya fue procesada.' });
    }

    await client.query('COMMIT');
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, numero_declaracion, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_VALIDATE', 'EXITO', $5, $6)`,
      [userId, username, ip, ua, numeroDocumento, `Estado final: ${finalEstado}. Comentarios: ${comentarios || 'Ninguno'}`]
    );
    return res.status(200).json({
      ok: true,
      message: `Declaración ${numeroDocumento} actualizada a estado: ${finalEstado}.`,
      estado: finalEstado
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al validar la declaración:', err);
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, numero_declaracion, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_VALIDATE', 'FALLO', $5, $6)`,
      [userId, username, ip, ua, numeroDocumento, err.message || 'Error 500']
    );
    return res.status(500).json({ ok: false, error: 'Error interno al procesar la validación.' });
  } finally {
    client.release();
  }
}

// GET /api/duca/my-declarations/status
export async function getMyDeclarationsStatus(req, res) {
  const ip = getClientIp(req);
  const ua = getUA(req);
  const userId = req.user.id;
  const username = getUsername(req);

  try {
    const q = `
      SELECT 
          numero_documento AS "numeroDocumento", 
          fecha_emision AS "fechaEmision", 
          estado_documento AS "estadoDocumento" 
      FROM 
          public.duca_declarations 
      WHERE 
          created_by_user_id = $1 
      ORDER BY 
          fecha_emision DESC
    `;
    const { rows } = await pool.query(q, [userId]);
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_STATUS_QUERY', 'EXITO', $5)`,
      [userId, username, ip, ua, `El usuario ${username} consultó ${rows.length} declaraciones.`]
    );
    return res.status(200).json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error al consultar estado de declaraciones:', err);
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_STATUS_QUERY', 'FALLO', $5)`,
      [userId, username, ip, ua, `Fallo en consulta: ${err.message}`]
    );
    return res.status(500).json({ ok: false, error: 'Error interno al consultar el estado de las declaraciones.' });
  }
}

// GET /api/duca/declarations/all - Para Dashboard y StatusAgente
export async function getAllDeclarations(req, res) {
  const ip = getClientIp(req);
  const ua = getUA(req);
  const userId = req.user.id;
  const username = getUsername(req);

  try {
    const q = `
      SELECT 
          d.numero_documento AS "numeroDocumento", 
          d.fecha_emision AS "fechaEmision", 
          u.full_name AS "full_name",
          d.tipo_operacion AS "tipoOperacion", 
          d.valor_aduana_total AS "valorAduanaTotal", 
          d.moneda, 
          d.estado_documento AS "estadoDocumento"
      FROM 
          public.duca_declarations d
      LEFT JOIN public.users u ON u.id = d.created_by_user_id
      ORDER BY 
          d.fecha_emision DESC
    `;
    
    const { rows } = await pool.query(q);
    
    // 🚨 DEBUG: Ver qué trae full_name
    console.log('✅ Ejemplo de DUCA con full_name:', rows[0]);
    
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_ALL_QUERY', 'EXITO', $5)`,
      [userId, username, ip, ua, `El agente ${username} consultó ${rows.length} declaraciones totales.`]
    );
    
    console.log(`✅ getAllDeclarations: ${rows.length} DUCAs encontradas`);
    
    return res.status(200).json({ ok: true, data: rows });
  } catch (err) {
    console.error('❌ Error en getAllDeclarations:', err);
    await pool.query(
      `INSERT INTO public.declaration_log (user_id, usuario, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'DECLARATION_ALL_QUERY', 'FALLO', $5)`,
      [userId, username, ip, ua, err.message || 'Error en consulta']
    );
    return res.status(500).json({ ok: false, error: 'Error de servidor.' });
  }
}