// src/public/js/agente.js - VERSIÓN DE PRUEBA SIMPLIFICADA

// === Elementos de la UI (AGREGANDO LOS NUEVOS PARA DASHBOARD Y STATUS) ===
const statusEl = document.getElementById('status');
const serverOut = document.getElementById('serverOut');
const roleInfo = document.getElementById('roleInfo');
const valErrors = document.getElementById('valErrors');
const pendingTableBody = document.getElementById('pendingTableBody');

// 🚨 NUEVOS ELEMENTOS
const allDucasTableBody = document.getElementById('allDucasTableBody'); // Para statusAgente.html
const enProcesoEl = document.getElementById('enProceso'); // Total DUCAs (Dashboard)
const pendientesEl = document.getElementById('pendientes'); // DUCAs Pendientes (Dashboard)
const validadasEl = document.getElementById('validadas'); // DUCAs Validadas (Dashboard)
const rechazadasEl = document.getElementById('rechazadas'); // DUCAs Rechazadas (Dashboard)


// 🚨 NUEVA VARIABLE GLOBAL PARA ALMACENAR TODAS LAS DUCAS
let allDucasData = [];

// === Event Listeners ===
document.getElementById('btnLogout').addEventListener('click', logout);
// === Inicialización ===
init();

function init() {
    const user = safeJson(localStorage.getItem('user')) || {};
    // ... (El resto de la lógica de rol y token se mantiene igual)
    roleInfo.textContent = user?.role ? `Autenticado como: ${user.role} · ${user.email || ''}` : '';
    const token = localStorage.getItem('token');
    console.log('🔷 Inicio - User:', user, 'Token presente:', !!token);
    
    if (!token) return goLogin();

    if (user?.role !== 'AGENTE') {
        showError('Solo AGENTE puede usar este módulo. Redirigiendo…');
        setTimeout(() => location.replace('/usuarios.html'), 1500);
        return; // Detener ejecución si el rol es incorrecto
    }
    
    // 🚨 Lógica para cargar contenido basado en la URL
    const path = window.location.pathname;
    if (path.includes('agente.html')) {
        // Carga solo las pendientes (lógica original)
        loadPendingDuca();
    } else if (path.includes('statusAgente.html')) {
        // Carga todas las DUCAs y renderiza la tabla completa
        loadAllDucas(true); 
    } else if (path.includes('dashboardAgente.html')) {
        // Carga todas las DUCAs solo para actualizar las estadísticas
        loadAllDucas(false); 
    }
}
// === Funciones Utilitarias ===
function goLogin() { location.replace('/index.html'); }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); goLogin(); }
function authHeaders() { const t = localStorage.getItem('token'); return { 'Authorization': `Bearer ${t}` }; }
function showStatus(msg) { statusEl.textContent = msg || ''; statusEl.classList.remove('text-danger'); statusEl.classList.add('text-muted'); }
function showError(msg, details) { statusEl.textContent = msg; statusEl.classList.remove('text-muted'); statusEl.classList.add('text-danger'); valErrors.textContent = details ? details.join('\n') : ''; }
function clearMsgs() { showStatus(''); valErrors.textContent = ''; }
function safeJson(x) { try { return JSON.parse(x); } catch (e) { console.error('Error parsing JSON:', e); return null; } }
function escapeHtml(s = '') { return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

// === Cargar Lista ===
async function loadPendingDuca() {
    clearMsgs();
    showStatus('Cargando lista de trabajo...');

    try {
        const res = await fetch('/api/duca/declarations/pending', {
            method: 'GET',
            headers: authHeaders(),
            cache: 'no-store'
        });
        const body = await res.json().catch((e) => { console.error('Error parsing response:', e); return {}; });
        console.log('✅ Respuesta de pending - Estado HTTP:', res.status, 'Cuerpo:', body);

        if (!res.ok || !body.ok) {
            if (res.status === 403) return showError('No autorizado. Se requiere rol AGENTE.');
            return showError('Error al cargar la lista', [body.error || `HTTP ${res.status}`]);
        }

        renderPendingTable(body.data || []);
        showStatus(`Lista cargada. ${body.data?.length || 0} DUCA(s) pendientes.`);
    } catch (err) {
        console.error('❌ Error en loadPendingDuca:', err);
        showError('No se pudo conectar con el servidor para cargar la lista.');
    }
}

function renderPendingTable(ducaList) {
    pendingTableBody.innerHTML = '';

    if (ducaList.length === 0) {
        pendingTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay declaraciones PENDIENTE.</td></tr>';
        return;
    }

    ducaList.forEach((duca, index) => {
        const valorTotal = typeof duca.valorAduanaTotal === 'number' && !isNaN(duca.valorAduanaTotal)
            ? duca.valorAduanaTotal.toFixed(2)
            : 'N/A';
        
        const row = pendingTableBody.insertRow();
        row.innerHTML = `
            <td>${escapeHtml(duca.numeroDocumento)}</td>
            <td>${escapeHtml(duca.fechaEmision)}</td>
            <td>${escapeHtml(duca.nombreExportador)}</td>
            <td>${escapeHtml(duca.nombreImportador)}</td>
            <td>${valorTotal} ${escapeHtml(duca.moneda)}</td>
            <td>
                <button class="btn btn-sm btn-success btn-validar" data-numero="${escapeHtml(duca.numeroDocumento)}">Validar</button>
                <button class="btn btn-sm btn-danger btn-rechazar" data-numero="${escapeHtml(duca.numeroDocumento)}">Rechazar</button>
            </td>
        `;
    });

    attachButtonListeners();
}

function attachButtonListeners() {
    // Botones de Validar
    document.querySelectorAll('.btn-validar').forEach(btn => {
        btn.addEventListener('click', function() {
            const numero = this.getAttribute('data-numero');
            console.log('🟢 Clic en Validar:', numero);
            
            // ✅ SIN MODAL - Confirmación directa
            if (confirm(`¿Confirma que desea VALIDAR la DUCA ${numero}?`)) {
                const comentarios = prompt('Comentarios (opcional):') || 'Validada por agente';
                sendValidation(numero, 'VALIDADA', comentarios);
            }
        });
    });

    // === Cargar TODA la Lista (Nuevo Endpoint) ===
async function loadAllDucas(shouldRenderTable) {
    clearMsgs();
    // Usamos statusEl si existe (no existe en statusAgente.html, pero sí en dashboardAgente.html)
    if (statusEl) showStatus('Cargando todas las declaraciones...'); 

    try {
        // 🚨 Llamada al nuevo endpoint /api/duca/declarations/all
        const res = await fetch('/api/duca/declarations/all', {
            method: 'GET',
            headers: authHeaders(),
            cache: 'no-store'
        });
        const body = await res.json().catch((e) => { console.error('Error parsing response:', e); return {}; });
        console.log('✅ Respuesta de ALL - Estado HTTP:', res.status, 'Cuerpo:', body);

        if (!res.ok || !body.ok) {
            if (res.status === 403) return showError('No autorizado. Se requiere rol AGENTE.');
            return showError('Error al cargar la lista total', [body.error || `HTTP ${res.status}`]);
        }

        // 🚨 Guardar la data globalmente para usarla en el filtro y dashboard
        allDucasData = body.data || [];

        // 🚨 Actualizar estadísticas para el Dashboard
        updateDashboardStats(allDucasData);

        // 🚨 Renderizar la tabla solo si estamos en statusAgente.html
        if (shouldRenderTable) {
            renderAllDucasTable(allDucasData);
            if (statusEl) showStatus(`Lista total cargada. ${allDucasData.length} DUCA(s) encontradas.`);
        } else {
            if (statusEl) showStatus(`Dashboard actualizado con ${allDucasData.length} DUCA(s).`);
        }
    } catch (err) {
        console.error('❌ Error en loadAllDucas:', err);
        showError('No se pudo conectar con el servidor para cargar la lista total.');
    }
}

// === Renderizar Tabla y Filtrar para statusAgente.html ===
function renderAllDucasTable(ducaList) {
    if (!allDucasTableBody) return; // Salir si el elemento de la tabla no existe
    
    allDucasTableBody.innerHTML = '';
    
    if (ducaList.length === 0) {
        allDucasTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay declaraciones que coincidan con el filtro.</td></tr>';
        return;
    }

    ducaList.forEach((duca) => {
        const valorTotal = typeof duca.valorAduanaTotal === 'number' && !isNaN(duca.valorAduanaTotal)
            ? duca.valorAduanaTotal.toFixed(2)
            : 'N/A';
        
        const estado = escapeHtml(duca.estadoDocumento);
        let estadoClass = '';
        if (estado === 'PENDIENTE') estadoClass = 'status-pending';
        else if (estado === 'VALIDADA') estadoClass = 'status-success';
        else if (estado === 'RECHAZADA') estadoClass = 'status-danger';

        const row = allDucasTableBody.insertRow();
        // Nota: asumo que tienes estilos CSS para 'status-pending', 'status-success', 'status-danger'.
        row.innerHTML = `
            <td>${escapeHtml(duca.numeroDocumento)}</td>
            <td>${escapeHtml(duca.fechaEmision)}</td>
            <td>${escapeHtml(duca.tipoOperacion)}</td>
            <td>${valorTotal} ${escapeHtml(duca.moneda)}</td>
            <td><span class="status-badge ${estadoClass}">${estado}</span></td>
            <td>
                <button class="btn btn-sm btn-info btn-view-duca" data-numero="${escapeHtml(duca.numeroDocumento)}" disabled>Ver Detalle</button>
            </td>
        `;
    });
}

// 🚨 Lógica de Filtrado (Se llama desde el onchange de statusAgente.html)
window.filterTable = function() {
    const filterStatusEl = document.getElementById('filterStatusAgente');
    if (!filterStatusEl) return;
    
    const selectedStatus = filterStatusEl.value; // 'TODOS', 'PENDIENTE', 'VALIDADA', 'RECHAZADA'
    
    let filteredList = [];
    if (selectedStatus === 'TODOS') {
        filteredList = allDucasData;
    } else {
        // Filtra la data guardada en la variable global
        filteredList = allDucasData.filter(duca => duca.estadoDocumento === selectedStatus);
    }
    
    renderAllDucasTable(filteredList);
}


// === Actualizar Estadísticas (Dashboard) ===
function updateDashboardStats(ducaList) {
    // Si no existen los elementos, salimos (no estamos en el dashboard)
    if (!enProcesoEl) return; 
    
    const total = ducaList.length;
    const pendientes = ducaList.filter(d => d.estadoDocumento === 'PENDIENTE').length;
    const validadas = ducaList.filter(d => d.estadoDocumento === 'VALIDADA').length;
    const rechazadas = ducaList.filter(d => d.estadoDocumento === 'RECHAZADA').length;

    // Actualiza los elementos del dashboardAgente.html
    enProcesoEl.textContent = total;
    pendientesEl.textContent = pendientes;
    validadasEl.textContent = validadas;
    rechazadasEl.textContent = rechazadas;
}
    // Botones de Rechazar
    document.querySelectorAll('.btn-rechazar').forEach(btn => {
        btn.addEventListener('click', function() {
            const numero = this.getAttribute('data-numero');
            console.log('🔴 Clic en Rechazar:', numero);
            
            // ✅ SIN MODAL - Confirmación directa
            if (confirm(`¿Confirma que desea RECHAZAR la DUCA ${numero}?`)) {
                const comentarios = prompt('Motivo del rechazo (obligatorio):');
                if (comentarios) {
                    sendValidation(numero, 'RECHAZADA', comentarios);
                } else {
                    alert('Debe indicar el motivo del rechazo');
                }
            }
        });
    });
    
    console.log('✅ Event listeners agregados a', document.querySelectorAll('.btn-validar').length, 'botones');
}

// === Enviar Validación (VERSIÓN SIMPLIFICADA) ===
async function sendValidation(numeroDocumento, nuevoEstado, comentarios) {
    clearMsgs();
    showStatus(`⏳ Procesando ${numeroDocumento}...`);
    
    const payload = {
        numeroDocumento: numeroDocumento,
        nuevoEstado: nuevoEstado,
        comentarios: comentarios || 'Sin comentarios'
    };
    
    console.log('📤 Enviando payload:', payload);
    
    try {
        const res = await fetch('/api/duca/declarations/validate', {
            method: 'POST',
            headers: { 
                ...authHeaders(), 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });
        
        console.log('📡 Response status:', res.status);
        
        const body = await res.json().catch((e) => { 
            console.error('❌ Error parsing response:', e); 
            return { ok: false, error: 'Error al parsear respuesta del servidor' }; 
        });
        
        console.log('📥 Respuesta del servidor:', body);
        serverOut.textContent = JSON.stringify(body, null, 2);

        if (!res.ok || !body.ok) {
            if (res.status === 403) return showError('❌ Acceso Denegado. Se requiere rol AGENTE.');
            if (res.status === 404) return showError(`❌ DUCA ${numeroDocumento} ya fue procesada o no existe.`);
            return showError(`❌ Error al validar: ${body.error || 'Error desconocido'}`);
        }
        
        showStatus(`✅ DUCA ${numeroDocumento} ha sido ${nuevoEstado} exitosamente`);
        
        // Recargar lista después de 2 segundos
        setTimeout(() => {
            console.log('🔄 Recargando lista...');
            loadPendingDuca();
        }, 2000);
        
    } catch (err) {
        console.error('❌ Error CRÍTICO en sendValidation:', err);
        serverOut.textContent = `ERROR: ${err.message}\n\n${err.stack}`;
        showError('❌ No se pudo conectar con el servidor. Verifique su conexión.');
    }
}

