// agente.js (REEMPLAZAR COMPLETO con esta versión)

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

let allDucasData = [];

// === Event Listeners ===
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnLogout')?.addEventListener('click', logout);
    init();
});

function init() {
    const user = safeJson(localStorage.getItem('user')) || {};
    if (roleInfo) roleInfo.textContent = user?.role ? ` ${user.role} | ${user.full_name || ''}` : '';
    const token = localStorage.getItem('token');
    console.log('🔷 Inicio - User:', user, 'Token presente:', !!token);

    if (!token) return goLogin();

    if (user?.role !== 'AGENTE') {
        showError('Solo AGENTE puede usar este módulo. Redirigiendo…');
        setTimeout(() => location.replace('/usuarios.html'), 1500);
        return;
    }

    const path = window.location.pathname;
    console.log('📄 Página actual:', path);

    if (path.includes('agente.html')) {
        console.log('🔷 Cargando vista: Validar DUCAs');
        loadPendingDuca();
    } else if (path.includes('statusAgente.html')) {
        console.log('🔷 Cargando vista: Estado General (con tabla)');
        loadAllDucas(true);
        // enableFilter() será llamado luego de cargar y renderizar las DUCAs
    } else if (path.includes('dashboardAgente.html')) {
        console.log('🔷 Cargando vista: Dashboard (solo stats)');
        loadAllDucas(false);
    }
}

// === Utilidades ===
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
function escapeHtml(s = '') { return (s + '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

// Normaliza string: trim, sin acentos simples, mayúsculas
function normalizeText(s = '') {
    // quitar tildes comunes y normalizar espacios
    const map = { 'á':'a','é':'e','í':'i','ó':'o','ú':'u','Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U' };
    let out = (s || '').toString().trim();
    out = out.replace(/[áéíóúÁÉÍÓÚ]/g, m => map[m] || m);
    out = out.replace(/\s+/g, ' ');
    return out.toUpperCase();
}

// Mapea el valor seleccionado (puede ser "Pendientes", "PENDIENTE", "PENDIENTES") al estado canónico
function selectedToCanonical(selected) {
    const n = normalizeText(selected);
    if (!n || n === 'TODOS' || n === 'ALL') return 'TODOS';
    // posibles variantes
    if (n.includes('PEND') ) return 'PENDIENTE';
    if (n.includes('VALID') ) return 'VALIDADA';
    if (n.includes('RECH') ) return 'RECHAZADA';
    // fallback: si viene ya igual
    return n;
}

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
        console.log('🔔 allDucasData cargado. Ejemplo[0]:', allDucasData[0]);
        updateDashboardStats(allDucasData);

        if (shouldRenderTable) {
            renderAllDucasTable(allDucasData);
            enableFilter(); // habilitamos el select una vez que los datos están cargados
            if (statusEl) showStatus(`Lista total cargada. ${allDucasData.length} DUCA(s) encontradas.`);
        } else {
            if (statusEl) showStatus(`Dashboard actualizado con ${allDucasData.length} DUCA(s).`);
        }
    } catch (err) {
        console.error('❌ Error en loadAllDucas:', err);
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

        const estadoRaw = duca.estadoDocumento || '';
        const estado = escapeHtml(estadoRaw);
        const estadoNorm = normalizeText(estadoRaw);

        const estadoClass = estadoNorm === 'PENDIENTE' ? 'badge bg-warning text-dark'
                         : estadoNorm === 'VALIDADA' ? 'badge bg-success'
                         : estadoNorm === 'RECHAZADA' ? 'badge bg-danger'
                         : 'badge bg-secondary';

        const row = allDucasTableBody.insertRow();
        const creadorNombre = duca.full_name ? escapeHtml(duca.full_name) : '<em class="text-muted">Sin creador</em>'
        const creadorNombre2 = duca.full_name2 ? escapeHtml(duca.full_name2) : '<em class="text-muted">Pendiente de Validarlo</em>'
        row.innerHTML = `
            <td>${escapeHtml(duca.numeroDocumento)}</td>
            <td>${escapeHtml(duca.fechaEmision)}</td>
            <td>${creadorNombre}</td>
            <td>${creadorNombre2}</td> 
            <td>${escapeHtml(duca.tipoOperacion)}</td>
            <td>${valorTotal} ${escapeHtml(duca.moneda)}</td>
            <td><span class="${estadoClass}" data-estado="${estadoNorm}">${estado}</span></td>
        `;
    });
}

// === Habilitar Filtro ===
function enableFilter() {
    const filter = document.getElementById('filterStatusAgente');
    if (filter) {
        filter.addEventListener('change', filterTable);
    }

}

window.filterTable = function() {
  const filter = document.getElementById('filterStatusAgente');
  if (!filter) {
    console.warn("⚠️ No se encontró el filtro en el DOM");
    return;
  }

  const selected = filter.value;
  console.log("🎯 Filtro seleccionado:", selected);

  if (!allDucasData || !Array.isArray(allDucasData) || allDucasData.length === 0) {
    console.warn("⚠️ allDucasData vacío o no inicializado");
    return;
  }

  // Normalizar texto y filtrar
  let filtered;
  if (selected === 'TODOS') {
    filtered = allDucasData;
  } else {
    filtered = allDucasData.filter(d =>
      (d.estadoDocumento || '').trim().toUpperCase() === selected.toUpperCase()
    );
  }

  console.log(`✅ Filtrando ${filtered.length} resultados de ${allDucasData.length}`);

  renderAllDucasTable(filtered);

  if (statusEl) {
    showStatus(`Mostrando ${filtered.length} DUCAs (${selected})`);
  }
};



// === Dashboard ===
function updateDashboardStats(ducaList) {
    if (!enProcesoEl) return;
    const total = ducaList.length;
    const pendientes = ducaList.filter(d => normalizeText(d.estadoDocumento) === 'PENDIENTE').length;
    const validadas = ducaList.filter(d => normalizeText(d.estadoDocumento) === 'VALIDADA').length;
    const rechazadas = ducaList.filter(d => normalizeText(d.estadoDocumento) === 'RECHAZADA').length;

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
    } catch (err) {
        console.error('❌ Error en sendValidation:', err);
        showError('No se pudo conectar con el servidor.');
    }
}
