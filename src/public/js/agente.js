// === Elementos de la UI ===
const statusEl = document.getElementById('status');
const serverOut = document.getElementById('serverOut');
const roleInfo = document.getElementById('roleInfo');
const valErrors = document.getElementById('valErrors');
const pendingTableBody = document.getElementById('pendingTableBody');

// Elementos para Dashboard y Status
const allDucasTableBody = document.getElementById('allDucasTableBody');
const enProcesoEl = document.getElementById('enProceso');
const pendientesEl = document.getElementById('pendientes');
const validadasEl = document.getElementById('validadas');
const rechazadasEl = document.getElementById('rechazadas');

// Variable global para almacenar todas las DUCAs
let allDucasData = [];

// === Event Listeners ===
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnLogout')?.addEventListener('click', logout);
    init();
});

function init() {
    const user = safeJson(localStorage.getItem('user')) || {};
    if (roleInfo) roleInfo.textContent = user?.role ? `Autenticado como: ${user.role} · ${user.email || ''}` : '';
    const token = localStorage.getItem('token');
    console.log('🔷 Inicio - User:', user, 'Token presente:', !!token);
    
    if (!token) return goLogin();

    if (user?.role !== 'AGENTE') {
        showError('Solo AGENTE puede usar este módulo. Redirigiendo…');
        setTimeout(() => location.replace('/usuarios.html'), 1500);
        return;
    }
    
    // Lógica para cargar contenido basado en la URL
    const path = window.location.pathname;
    console.log('📄 Página actual:', path);
    
    if (path.includes('agente.html')) {
        console.log('🔷 Cargando vista: Validar DUCAs');
        loadPendingDuca();
    } else if (path.includes('statusAgente.html')) {
        console.log('🔷 Cargando vista: Estado General (con tabla)');
        loadAllDucas(true); 
        enableFilter();
    } else if (path.includes('dashboardAgente.html')) {
        console.log('🔷 Cargando vista: Dashboard (solo stats)');
        loadAllDucas(false); 
    }
}

// === Funciones Utilitarias ===
function goLogin() { location.replace('/index.html'); }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); goLogin(); }
function authHeaders() { const t = localStorage.getItem('token'); return { 'Authorization': `Bearer ${t}` }; }
function showStatus(msg) { 
    if (statusEl) {
        statusEl.textContent = msg || ''; 
        statusEl.classList.remove('text-danger'); 
        statusEl.classList.add('text-muted'); 
    }
}
function showError(msg, details) { 
    if (statusEl) {
        statusEl.textContent = msg; 
        statusEl.classList.remove('text-muted'); 
        statusEl.classList.add('text-danger'); 
    }
    if (valErrors) valErrors.textContent = details ? details.join('\n') : ''; 
}
function clearMsgs() { showStatus(''); if (valErrors) valErrors.textContent = ''; }
function safeJson(x) { try { return JSON.parse(x); } catch (e) { console.error('Error parsing JSON:', e); return null; } }
function escapeHtml(s = '') { return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

// === Cargar DUCAs Pendientes ===
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
    if (!pendingTableBody) return;
    
    pendingTableBody.innerHTML = '';

    if (ducaList.length === 0) {
        pendingTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay declaraciones PENDIENTE.</td></tr>';
        return;
    }

    ducaList.forEach((duca) => {
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
    document.querySelectorAll('.btn-validar').forEach(btn => {
        btn.addEventListener('click', function() {
            const numero = this.getAttribute('data-numero');
            if (confirm(`¿Confirma que desea VALIDAR la DUCA ${numero}?`)) {
                const comentarios = prompt('Comentarios (opcional):') || 'Validada por agente';
                sendValidation(numero, 'VALIDADA', comentarios);
            }
        });
    });

    document.querySelectorAll('.btn-rechazar').forEach(btn => {
        btn.addEventListener('click', function() {
            const numero = this.getAttribute('data-numero');
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
}

// === Cargar TODAS las DUCAs ===
async function loadAllDucas(shouldRenderTable) {
    clearMsgs();
    if (statusEl) showStatus('Cargando todas las declaraciones...'); 

    try {
        const res = await fetch('/api/duca/declarations/all', {
            method: 'GET',
            headers: authHeaders(),
            cache: 'no-store'
        });
        
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
            if (res.status === 403) return showError('No autorizado. Se requiere rol AGENTE.');
            return showError('Error al cargar la lista total', [body.error || `HTTP ${res.status}`]);
        }

        allDucasData = body.data || [];
        updateDashboardStats(allDucasData);

        if (shouldRenderTable) {
            renderAllDucasTable(allDucasData);
            if (statusEl) showStatus(`Lista total cargada. ${allDucasData.length} DUCA(s) encontradas.`);
        } else {
            if (statusEl) showStatus(`Dashboard actualizado con ${allDucasData.length} DUCA(s).`);
        }
    } catch (err) {
        showError('No se pudo conectar con el servidor para cargar la lista total.');
    }
}

// === Renderizar Tabla ===
function renderAllDucasTable(ducaList) {
    if (!allDucasTableBody) return;
    allDucasTableBody.innerHTML = '';

    if (ducaList.length === 0) {
        allDucasTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#7f8c8d;">No hay declaraciones.</td></tr>';
        return;
    }

    ducaList.forEach((duca) => {
        const valorTotal = typeof duca.valorAduanaTotal === 'number' && !isNaN(duca.valorAduanaTotal)
            ? duca.valorAduanaTotal.toFixed(2)
            : (duca.valorAduanaTotal || 'N/A');
        
        const estado = escapeHtml(duca.estadoDocumento);
        const estadoClass = estado === 'PENDIENTE' ? 'badge bg-warning text-dark'
                         : estado === 'VALIDADA' ? 'badge bg-success'
                         : estado === 'RECHAZADA' ? 'badge bg-danger'
                         : 'badge bg-secondary';

        const row = allDucasTableBody.insertRow();
        row.innerHTML = `
            <td>${escapeHtml(duca.numeroDocumento)}</td>
            <td>${escapeHtml(duca.fechaEmision)}</td>
            <td>${escapeHtml(duca.tipoOperacion)}</td>
            <td>${valorTotal} ${escapeHtml(duca.moneda)}</td>
            <td><span class="${estadoClass}">${estado}</span></td>
            <td><button class="btn btn-sm btn-info">Ver Detalle</button></td>
        `;
    });
}

// === Habilitar Filtro ===
function enableFilter() {
    const filter = document.getElementById('filterStatusAgente');
    if (filter) filter.disabled = false;
}

// === Filtrar Tabla ===
window.filterTable = function() {
    const filter = document.getElementById('filterStatusAgente');
    if (!filter) return;

    const selected = filter.value;
    if (!allDucasData.length) return;

    const filtered = selected === 'TODOS' ? allDucasData
        : allDucasData.filter(d => d.estadoDocumento === selected);

    renderAllDucasTable(filtered);
};

// === Dashboard ===
function updateDashboardStats(ducaList) {
    if (!enProcesoEl) return;
    const total = ducaList.length;
    const pendientes = ducaList.filter(d => d.estadoDocumento === 'PENDIENTE').length;
    const validadas = ducaList.filter(d => d.estadoDocumento === 'VALIDADA').length;
    const rechazadas = ducaList.filter(d => d.estadoDocumento === 'RECHAZADA').length;

    enProcesoEl.textContent = total;
    pendientesEl.textContent = pendientes;
    validadasEl.textContent = validadas;
    rechazadasEl.textContent = rechazadas;
}

// === Enviar Validación ===
async function sendValidation(numeroDocumento, nuevoEstado, comentarios) {
    clearMsgs();
    showStatus(`Procesando ${numeroDocumento}...`);
    
    const payload = { numeroDocumento, nuevoEstado, comentarios: comentarios || 'Sin comentarios' };
    
    try {
        const res = await fetch('/api/duca/declarations/validate', {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) return showError(body.error || 'Error al validar DUCA.');

        showStatus(`DUCA ${numeroDocumento} ha sido ${nuevoEstado} exitosamente`);
        setTimeout(loadPendingDuca, 2000);
    } catch {
        showError('No se pudo conectar con el servidor.');
    }
}
