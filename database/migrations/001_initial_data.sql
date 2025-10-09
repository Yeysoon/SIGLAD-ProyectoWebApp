-- =============================================
-- SISTEMA SIGLAD - BASE DE DATOS POSTGRESQL
-- =============================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- SCHEMAS
-- =============================================

CREATE SCHEMA IF NOT EXISTS siglad;
CREATE SCHEMA IF NOT EXISTS auditoria;

-- =============================================
-- ENUMERACIONES (TYPES)
-- =============================================

CREATE TYPE siglad.rol_usuario AS ENUM ('ADMINISTRADOR', 'TRANSPORTISTA', 'AGENTE_ADUANERO');
CREATE TYPE siglad.estado_usuario AS ENUM ('ACTIVO', 'INACTIVO');
CREATE TYPE siglad.estado_declaracion AS ENUM ('PENDIENTE', 'VALIDADA', 'RECHAZADA', 'CONFIRMADO', 'EN_PROCESO', 'ANULADO');
CREATE TYPE siglad.tipo_operacion AS ENUM ('IMPORTACION', 'EXPORTACION', 'TRANSITO');
CREATE TYPE siglad.medio_transporte AS ENUM ('TERRESTRE', 'MARITIMO', 'AEREO');
CREATE TYPE siglad.tipo_operacion_bitacora AS ENUM ('LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'USUARIO_CREADO', 'USUARIO_MODIFICADO', 'USUARIO_ELIMINADO', 'REGISTRO_DECLARACION', 'CONSULTA_DECLARACION', 'VALIDACION_DECLARACION', 'RECHAZO_DECLARACION');

-- =============================================
-- TABLA: USUARIOS
-- =============================================

CREATE TABLE siglad.usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol siglad.rol_usuario NOT NULL,
    estado siglad.estado_usuario DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_correo ON siglad.usuarios(correo);
CREATE INDEX idx_usuarios_rol ON siglad.usuarios(rol);
CREATE INDEX idx_usuarios_estado ON siglad.usuarios(estado);

-- =============================================
-- TABLA: DECLARACIONES ADUANERAS (DUCA)
-- =============================================

CREATE TABLE siglad.declaraciones (
    id_declaracion SERIAL PRIMARY KEY,
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    fecha_emision DATE NOT NULL,
    pais_emisor VARCHAR(2) NOT NULL,
    tipo_operacion siglad.tipo_operacion NOT NULL,
    estado_documento siglad.estado_declaracion DEFAULT 'PENDIENTE',
    firma_electronica VARCHAR(64) NOT NULL,
    id_usuario_registro INTEGER NOT NULL REFERENCES siglad.usuarios(id_usuario),
    id_usuario_validacion INTEGER REFERENCES siglad.usuarios(id_usuario),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_validacion TIMESTAMP,
    observaciones TEXT,
    json_completo JSONB NOT NULL,
    CONSTRAINT chk_pais_emisor CHECK (length(pais_emisor) = 2)
);

-- Índices para declaraciones
CREATE INDEX idx_declaraciones_numero ON siglad.declaraciones(numero_documento);
CREATE INDEX idx_declaraciones_estado ON siglad.declaraciones(estado_documento);
CREATE INDEX idx_declaraciones_usuario ON siglad.declaraciones(id_usuario_registro);
CREATE INDEX idx_declaraciones_fecha ON siglad.declaraciones(fecha_emision);
CREATE INDEX idx_declaraciones_jsonb ON siglad.declaraciones USING GIN (json_completo);

-- =============================================
-- TABLA: EXPORTADORES
-- =============================================

CREATE TABLE siglad.exportadores (
    id_exportador_interno SERIAL PRIMARY KEY,
    id_exportador VARCHAR(15) UNIQUE NOT NULL,
    nombre_exportador VARCHAR(100) NOT NULL,
    direccion_exportador VARCHAR(120),
    telefono VARCHAR(15),
    email VARCHAR(60),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exportadores_id ON siglad.exportadores(id_exportador);

-- =============================================
-- TABLA: IMPORTADORES
-- =============================================

CREATE TABLE siglad.importadores (
    id_importador_interno SERIAL PRIMARY KEY,
    id_importador VARCHAR(15) UNIQUE NOT NULL,
    nombre_importador VARCHAR(100) NOT NULL,
    direccion_importador VARCHAR(120),
    telefono VARCHAR(15),
    email VARCHAR(60),
    estado siglad.estado_usuario DEFAULT 'ACTIVO',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_importadores_id ON siglad.importadores(id_importador);
CREATE INDEX idx_importadores_estado ON siglad.importadores(estado);

-- =============================================
-- TABLA: TRANSPORTE
-- =============================================

CREATE TABLE siglad.transporte (
    id_transporte SERIAL PRIMARY KEY,
    id_declaracion INTEGER NOT NULL REFERENCES siglad.declaraciones(id_declaracion) ON DELETE CASCADE,
    medio_transporte siglad.medio_transporte NOT NULL,
    placa_vehiculo VARCHAR(10) NOT NULL,
    nombre_conductor VARCHAR(80),
    licencia_conductor VARCHAR(20),
    pais_licencia VARCHAR(2),
    aduana_salida VARCHAR(50) NOT NULL,
    aduana_entrada VARCHAR(50) NOT NULL,
    pais_destino VARCHAR(2) NOT NULL,
    kilometros_aproximados INTEGER
);

CREATE INDEX idx_transporte_declaracion ON siglad.transporte(id_declaracion);
CREATE INDEX idx_transporte_placa ON siglad.transporte(placa_vehiculo);

-- =============================================
-- TABLA: MERCANCIAS (ITEMS)
-- =============================================

CREATE TABLE siglad.mercancias (
    id_mercancia SERIAL PRIMARY KEY,
    id_declaracion INTEGER NOT NULL REFERENCES siglad.declaraciones(id_declaracion) ON DELETE CASCADE,
    linea INTEGER NOT NULL,
    descripcion VARCHAR(120) NOT NULL,
    cantidad INTEGER NOT NULL,
    unidad_medida VARCHAR(10) NOT NULL,
    valor_unitario NUMERIC(10,2) NOT NULL,
    pais_origen VARCHAR(2) NOT NULL,
    CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    CONSTRAINT chk_valor_positivo CHECK (valor_unitario > 0)
);

CREATE INDEX idx_mercancias_declaracion ON siglad.mercancias(id_declaracion);

-- =============================================
-- TABLA: VALORES DECLARACIÓN
-- =============================================

CREATE TABLE siglad.valores_declaracion (
    id_valores SERIAL PRIMARY KEY,
    id_declaracion INTEGER NOT NULL UNIQUE REFERENCES siglad.declaraciones(id_declaracion) ON DELETE CASCADE,
    valor_factura NUMERIC(12,2) NOT NULL,
    gastos_transporte NUMERIC(10,2) DEFAULT 0,
    seguro NUMERIC(10,2) DEFAULT 0,
    otros_gastos NUMERIC(10,2) DEFAULT 0,
    valor_aduana_total NUMERIC(12,2) NOT NULL,
    moneda VARCHAR(3) NOT NULL,
    CONSTRAINT chk_moneda_length CHECK (length(moneda) = 3)
);

CREATE INDEX idx_valores_declaracion ON siglad.valores_declaracion(id_declaracion);

-- =============================================
-- TABLA: RESULTADO SELECTIVO
-- =============================================

CREATE TABLE siglad.resultado_selectivo (
    id_resultado SERIAL PRIMARY KEY,
    id_declaracion INTEGER NOT NULL UNIQUE REFERENCES siglad.declaraciones(id_declaracion) ON DELETE CASCADE,
    codigo VARCHAR(1),
    descripcion VARCHAR(60)
);

-- =============================================
-- TABLA: BITÁCORA (AUDITORÍA)
-- =============================================

CREATE TABLE auditoria.bitacora (
    id_bitacora SERIAL PRIMARY KEY,
    numero_correlativo BIGINT UNIQUE NOT NULL,
    usuario VARCHAR(100),
    id_usuario INTEGER REFERENCES siglad.usuarios(id_usuario),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_origen VARCHAR(45),
    operacion siglad.tipo_operacion_bitacora NOT NULL,
    resultado VARCHAR(20) NOT NULL,
    numero_declaracion VARCHAR(20),
    detalles JSONB
);

-- Índices para bitácora
CREATE INDEX idx_bitacora_usuario ON auditoria.bitacora(usuario);
CREATE INDEX idx_bitacora_fecha ON auditoria.bitacora(fecha_hora);
CREATE INDEX idx_bitacora_operacion ON auditoria.bitacora(operacion);
CREATE INDEX idx_bitacora_declaracion ON auditoria.bitacora(numero_declaracion);

-- Secuencia para número correlativo de bitácora
CREATE SEQUENCE auditoria.seq_correlativo_bitacora START 1;

-- =============================================
-- FUNCIONES AUXILIARES
-- =============================================

-- Función para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION siglad.actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número correlativo de bitácora
CREATE OR REPLACE FUNCTION auditoria.generar_correlativo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_correlativo = nextval('auditoria.seq_correlativo_bitacora');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar en bitácora
CREATE OR REPLACE FUNCTION auditoria.registrar_bitacora(
    p_usuario VARCHAR,
    p_id_usuario INTEGER,
    p_ip_origen VARCHAR,
    p_operacion siglad.tipo_operacion_bitacora,
    p_resultado VARCHAR,
    p_numero_declaracion VARCHAR DEFAULT NULL,
    p_detalles JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO auditoria.bitacora (usuario, id_usuario, ip_origen, operacion, resultado, numero_declaracion, detalles)
    VALUES (p_usuario, p_id_usuario, p_ip_origen, p_operacion, p_resultado, p_numero_declaracion, p_detalles);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Actualizar fecha_actualizacion en usuarios
CREATE TRIGGER trg_usuarios_fecha_actualizacion
BEFORE UPDATE ON siglad.usuarios
FOR EACH ROW
EXECUTE FUNCTION siglad.actualizar_fecha_modificacion();

-- Trigger: Generar correlativo automático en bitácora
CREATE TRIGGER trg_bitacora_correlativo
BEFORE INSERT ON auditoria.bitacora
FOR EACH ROW
EXECUTE FUNCTION auditoria.generar_correlativo();

-- Trigger: Auditar creación de usuarios
CREATE OR REPLACE FUNCTION auditoria.auditar_creacion_usuario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO auditoria.bitacora (usuario, id_usuario, operacion, resultado, detalles)
    VALUES (NEW.correo, NEW.id_usuario, 'USUARIO_CREADO', 'EXITO', 
            jsonb_build_object('nombre', NEW.nombre, 'rol', NEW.rol));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_creacion_usuario
AFTER INSERT ON siglad.usuarios
FOR EACH ROW
EXECUTE FUNCTION auditoria.auditar_creacion_usuario();

-- Trigger: Auditar modificación de usuarios
CREATE OR REPLACE FUNCTION auditoria.auditar_modificacion_usuario()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado != NEW.estado OR OLD.rol != NEW.rol THEN
        INSERT INTO auditoria.bitacora (usuario, id_usuario, operacion, resultado, detalles)
        VALUES (NEW.correo, NEW.id_usuario, 'USUARIO_MODIFICADO', 'EXITO',
                jsonb_build_object('estado_anterior', OLD.estado, 'estado_nuevo', NEW.estado,
                                   'rol_anterior', OLD.rol, 'rol_nuevo', NEW.rol));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_modificacion_usuario
AFTER UPDATE ON siglad.usuarios
FOR EACH ROW
EXECUTE FUNCTION auditoria.auditar_modificacion_usuario();

-- Trigger: Auditar registro de declaraciones
CREATE OR REPLACE FUNCTION auditoria.auditar_declaracion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO auditoria.bitacora (id_usuario, operacion, resultado, numero_declaracion)
    VALUES (NEW.id_usuario_registro, 'REGISTRO_DECLARACION', 'EXITO', NEW.numero_documento);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_declaracion
AFTER INSERT ON siglad.declaraciones
FOR EACH ROW
EXECUTE FUNCTION auditoria.auditar_declaracion();

-- Trigger: Auditar validación/rechazo de declaraciones
CREATE OR REPLACE FUNCTION auditoria.auditar_validacion_declaracion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado_documento != NEW.estado_documento AND NEW.estado_documento IN ('VALIDADA', 'RECHAZADA') THEN
        INSERT INTO auditoria.bitacora (id_usuario, operacion, resultado, numero_declaracion, detalles)
        VALUES (NEW.id_usuario_validacion, 
                CASE WHEN NEW.estado_documento = 'VALIDADA' THEN 'VALIDACION_DECLARACION' 
                     ELSE 'RECHAZO_DECLARACION' END,
                'EXITO', NEW.numero_documento,
                jsonb_build_object('observaciones', NEW.observaciones));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_validacion_declaracion
AFTER UPDATE ON siglad.declaraciones
FOR EACH ROW
EXECUTE FUNCTION auditoria.auditar_validacion_declaracion();

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Usuario administrador por defecto (password: Admin123!)
-- Hash generado con bcrypt para 'Admin123!'
INSERT INTO siglad.usuarios (nombre, correo, password_hash, rol, estado)
VALUES ('Administrador del Sistema', 'admin@siglad.gt', 
        '$2b$10$rQVq7qx8YhC4vXPT7YpZl.7kZQJX2bNJ6h0h2mJkJ4LQhKQdKHW5K', 
        'ADMINISTRADOR', 'ACTIVO');

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista: Declaraciones con información completa
CREATE OR REPLACE VIEW siglad.v_declaraciones_completas AS
SELECT 
    d.id_declaracion,
    d.numero_documento,
    d.fecha_emision,
    d.pais_emisor,
    d.tipo_operacion,
    d.estado_documento,
    u_reg.nombre as usuario_registro,
    u_val.nombre as usuario_validacion,
    d.fecha_registro,
    d.fecha_validacion,
    t.medio_transporte,
    t.placa_vehiculo,
    v.valor_aduana_total,
    v.moneda,
    d.observaciones
FROM siglad.declaraciones d
LEFT JOIN siglad.usuarios u_reg ON d.id_usuario_registro = u_reg.id_usuario
LEFT JOIN siglad.usuarios u_val ON d.id_usuario_validacion = u_val.id_usuario
LEFT JOIN siglad.transporte t ON d.id_declaracion = t.id_declaracion
LEFT JOIN siglad.valores_declaracion v ON d.id_declaracion = v.id_declaracion;

-- Vista: Bitácora legible
CREATE OR REPLACE VIEW auditoria.v_bitacora_legible AS
SELECT 
    b.numero_correlativo,
    b.usuario,
    u.nombre as nombre_usuario,
    u.rol,
    b.fecha_hora,
    b.ip_origen,
    b.operacion,
    b.resultado,
    b.numero_declaracion,
    b.detalles
FROM auditoria.bitacora b
LEFT JOIN siglad.usuarios u ON b.id_usuario = u.id_usuario
ORDER BY b.fecha_hora DESC;

-- =============================================
-- COMENTARIOS EN TABLAS
-- =============================================

COMMENT ON TABLE siglad.usuarios IS 'Usuarios del sistema con roles y autenticación';
COMMENT ON TABLE siglad.declaraciones IS 'Declaraciones aduaneras (DUCA) registradas';
COMMENT ON TABLE auditoria.bitacora IS 'Registro de auditoría de todas las operaciones del sistema';
COMMENT ON TABLE siglad.transporte IS 'Información de transporte asociada a declaraciones';
COMMENT ON TABLE siglad.mercancias IS 'Items/mercancías declaradas';

-- =============================================
-- FIN DEL SCRIPT
-- =============================================