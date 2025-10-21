const statusEl = document.getElementById('status');
const serverOut = document.getElementById('serverOut');
const jsonInput = document.getElementById('jsonInput');
const valErrors = document.getElementById('valErrors');
const roleInfo = document.getElementById('roleInfo');

// Detectar en qué página estamos
const currentPage = window.location.pathname.split('/').pop();

// Event listeners comunes
document.getElementById('btnLogout')?.addEventListener('click', logout);

// Event listeners específicos por página
if (currentPage === 'duca.html') {
  document.getElementById('btnPreload')?.addEventListener('click', preload);
  document.getElementById('btnPretty')?.addEventListener('click', pretty);
  document.getElementById('btnValidate')?.addEventListener('click', validateOnly);
  document.getElementById('btnSend')?.addEventListener('click', sendDUCA);
} else if (currentPage === 'dashboardDuca.html') {
  document.getElementById('btnRefresh')?.addEventListener('click', loadDashboard);
} else if (currentPage === 'statusDuca.html') {
  document.getElementById('btnRefreshStatus')?.addEventListener('click', loadStatusDucas);
  document.getElementById('filterStatus')?.addEventListener('change', filterDucas);
}

init();

function init() {
  const user = safeJson(localStorage.getItem('user')) || {};
  if (roleInfo) {
    roleInfo.textContent = user?.role ? `Autenticado como: ${user.role} · ${user.email || ''}` : '';
  }
  const token = localStorage.getItem('token');
  if (!token) return goLogin();

  if (user?.role !== 'TRANSPORTISTA') {
    showError('Solo TRANSPORTISTA puede usar este módulo. Redirigiendo…');
    setTimeout(() => location.replace('/usuarios.html'), 1500);
    return;
  }

  // Cargar datos según la página
  if (currentPage === 'dashboardDuca.html') {
    loadDashboard();
  } else if (currentPage === 'statusDuca.html') {
    loadStatusDucas();
  }
}

function goLogin() {
  location.replace('/index.html');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  goLogin();
}

function authHeaders() {
  const t = localStorage.getItem('token');
  return { 'Authorization': `Bearer ${t}` };
}

function showStatus(msg) {
  if (statusEl) {
    statusEl.textContent = msg || '';
  }
}

function showError(msg, details) {
  if (statusEl) {
    statusEl.textContent = msg || 'Error';
    statusEl.classList.remove('text-muted');
    statusEl.classList.add('text-danger');
  }
  if (valErrors && details?.length) {
    valErrors.innerHTML = `<div class="alert alert-danger"><ul class="mb-0">${details.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
  } else if (valErrors) {
    valErrors.innerHTML = '';
  }
}

function clearMsgs() {
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.remove('text-danger');
    statusEl.classList.add('text-muted');
  }
  if (valErrors) valErrors.innerHTML = '';
  if (serverOut) serverOut.textContent = '{}';
}

function safeJson(x) {
  try { return JSON.parse(x); } catch { return null; }
}

// ========================================
// FUNCIONES PARA duca.html (Crear DUCA)
// ========================================

function preload() {
  const sample = {
    "duca": {
      "numeroDocumento": "GT2025DUCA001234",
      "fechaEmision": "2025-10-04",
      "paisEmisor": "GT",
      "tipoOperacion": "IMPORTACION",
      "exportador": {
        "idExportador": "EXP-00145",
        "nombreExportador": "Comercial del Norte S.A.",
        "direccionExportador": "Zona 12, Ciudad de Guatemala",
        "contactoExportador": {
          "telefono": "+50245678900",
          "email": "exportaciones@comnorte.gt"
        }
      },
      "importador": {
        "idImportador": "IMP-00984",
        "nombreImportador": "Distribuciones del Sur Ltda.",
        "direccionImportador": "San Salvador, El Salvador",
        "contactoImportador": {
          "telefono": "+50377780000",
          "email": "compras@distsur.sv"
        }
      },
      "transporte": {
        "medioTransporte": "TERRESTRE",
        "placaVehiculo": "C123BGT",
        "conductor": {
          "nombreConductor": "Juan Pérez",
          "licenciaConductor": "L-987654",
          "paisLicencia": "GT"
        },
        "ruta": {
          "aduanaSalida": "PUERTO BARRIOS",
          "aduanaEntrada": "SAN CRISTÓBAL",
          "paisDestino": "SV",
          "kilometrosAproximados": 325
        }
      },
      "mercancias": {
        "numeroItems": 2,
        "items": [
          {
            "linea": 1,
            "descripcion": "Componentes electrónicos",
            "cantidad": 500,
            "unidadMedida": "CAJA",
            "valorUnitario": 45.50,
            "paisOrigen": "CN"
          },
          {
            "linea": 2,
            "descripcion": "Cables industriales",
            "cantidad": 200,
            "unidadMedida": "ROLLO",
            "valorUnitario": 20.00,
            "paisOrigen": "MX"
          }
        ]
      },
      "valores": {
        "valorFactura": 32500.00,
        "gastosTransporte": 1500.00,
        "seguro": 300.00,
        "otrosGastos": 100.00,
        "valorAduanaTotal": 34400.00,
        "moneda": "USD"
      },
      "resultadoSelectivo": {
        "codigo": "R",
        "descripcion": "Revisión documental"
      },
      "estadoDocumento": "PENDIENTE",
      "firmaElectronica": "AB12CD34EF56GH78"
    }
  };
  jsonInput.value = JSON.stringify(sample, null, 2);
  showStatus('Ejemplo cargado');
}

function pretty() {
  const data = safeJson(jsonInput.value);
  if (!data) return showError('JSON inválido, no se puede formatear');
  jsonInput.value = JSON.stringify(data, null, 2);
  showStatus('Formateado');
}

function validateOnly() {
  clearMsgs();
  const data = safeJson(jsonInput.value);
  if (!data) return showError('JSON inválido', ['No se pudo parsear el JSON.']);
  const e = [];
  if (!data.duca) e.push('Falta objeto raíz "duca".');
  if (!data?.duca?.numeroDocumento) e.push('Falta "duca.numeroDocumento".');
  if (e.length) return showError('Verifique los campos obligatorios', e);
  showStatus('JSON con estructura básica OK');
}

async function sendDUCA() {
  clearMsgs();
  const data = safeJson(jsonInput.value);
  if (!data) return showError('JSON inválido', ['No se pudo parsear el JSON.']);

  showStatus('Enviando...');
  try {
    const res = await fetch('/api/duca/recepcion', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store'
    });
    const body = await res.json().catch(() => ({}));

    serverOut.textContent = JSON.stringify(body, null, 2);

    if (!res.ok || !body.ok) {
      if (res.status === 400) {
        return showError('Verifique los campos obligatorios', body.details || [body.error || 'Solicitud inválida']);
      }
      if (res.status === 409) {
        return showError('DUCA ya registrada', [body.error]);
      }
      if (res.status === 403) {
        return showError('No autorizado (se requiere TRANSPORTISTA)');
      }
      return showError('Error al registrar la declaración', [body.error || `HTTP ${res.status}`]);
    }

    showStatus('Declaración registrada correctamente ✅');
  } catch (err) {
    serverOut.textContent = String(err);
    showError('No se pudo conectar con el servidor');
  }
}

// ========================================
// FUNCIONES PARA dashboardDuca.html
// ========================================

async function loadDashboard() {
  try {
    const res = await fetch('/api/duca/declarations/status', {
      headers: authHeaders(),
      cache: 'no-store'
    });

    if (!res.ok) {
      showDashboardError('No se pudieron cargar las estadísticas');
      return;
    }

    const body = await res.json();
    if (!body.ok || !body.data) {
      showDashboardError('Respuesta inválida del servidor');
      return;
    }

    const ducas = body.data;
    
    // Calcular estadísticas
    const stats = {
      total: ducas.length,
      pendiente: ducas.filter(d => d.estadoDocumento === 'PENDIENTE').length,
      validada: ducas.filter(d => d.estadoDocumento === 'VALIDADA').length,
      rechazada: ducas.filter(d => d.estadoDocumento === 'RECHAZADA').length
    };

    // Actualizar estadísticas
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPendiente').textContent = stats.pendiente;
    document.getElementById('statValidada').textContent = stats.validada;
    document.getElementById('statRechazada').textContent = stats.rechazada;

    // Mostrar últimas 5 DUCAs
    displayRecentDucas(ducas.slice(0, 5));

  } catch (err) {
    showDashboardError('Error al conectar con el servidor');
  }
}

function displayRecentDucas(ducas) {
  const recentList = document.getElementById('recentList');
  if (!ducas || ducas.length === 0) {
    recentList.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 20px;">No hay DUCAs registradas</p>';
    return;
  }

  recentList.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background: #f8f9fa;">
        <tr>
          <th style="padding: 10px; text-align: left; font-size: 13px; color: #2c3e50;">Número Documento</th>
          <th style="padding: 10px; text-align: left; font-size: 13px; color: #2c3e50;">Fecha</th>
          <th style="padding: 10px; text-align: left; font-size: 13px; color: #2c3e50;">Tipo</th>
          <th style="padding: 10px; text-align: center; font-size: 13px; color: #2c3e50;">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${ducas.map(duca => {
          const badgeClass = {
            'PENDIENTE': 'badge-pendiente',
            'VALIDADA': 'badge-validada',
            'RECHAZADA': 'badge-rechazada'
          }[duca.estadoDocumento] || 'badge-pendiente';

          return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px; font-weight: 600; color: #2c3e50;">${escapeHtml(duca.numeroDocumento)}</td>
              <td style="padding: 10px; color: #7f8c8d;">${new Date(duca.fechaEmision).toLocaleDateString('es-GT')}</td>
              <td style="padding: 10px; color: #34495e;">${escapeHtml(duca.tipoOperacion || '-')}</td>
              <td style="padding: 10px; text-align: center;">
                <span class="badge ${badgeClass}" style="padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;">
                  ${escapeHtml(duca.estadoDocumento)}
                </span>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function showDashboardError(msg) {
  const statusMsg = document.getElementById('statusMsg');
  if (statusMsg) {
    statusMsg.className = 'alert alert-danger';
    statusMsg.textContent = msg;
    statusMsg.style.display = 'block';
  }
}

// ========================================
// FUNCIONES PARA statusDuca.html
// ========================================

let allDucas = [];

async function loadStatusDucas() {
  const tableBody = document.getElementById('ducasTableBody');
  const statusMsg = document.getElementById('statusMsgStatus');
  
  if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando...</td></tr>';

  try {
    const res = await fetch('/api/duca/declarations/status', {
      headers: authHeaders(),
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error('Error al cargar DUCAs');
    }

    const body = await res.json();
    if (!body.ok || !body.data) {
      throw new Error('Respuesta inválida del servidor');
    }

    allDucas = body.data;
    displayDucasTable(allDucas);

  } catch (err) {
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar las DUCAs</td></tr>';
    }
    if (statusMsg) {
      statusMsg.className = 'alert alert-danger';
      statusMsg.textContent = 'Error al conectar con el servidor';
      statusMsg.style.display = 'block';
    }
  }
}

function displayDucasTable(ducas) {
  const tableBody = document.getElementById('ducasTableBody');
  if (!ducas || ducas.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay DUCAs registradas</td></tr>';
    return;
  }

  tableBody.innerHTML = ducas.map(duca => {
    const badgeClass = {
      'PENDIENTE': 'badge-pendiente',
      'VALIDADA': 'badge-validada',
      'RECHAZADO': 'badge-rechazado'
    }[duca.estadoDocumento] || 'badge-pendiente';

    return `
      <tr>
        <td>${escapeHtml(duca.numeroDocumento)}</td>
        <td>${new Date(duca.fechaEmision).toLocaleDateString('es-GT')}</td>
        <td>${escapeHtml(duca.tipoOperacion || '-')}</td>
        <td>$${parseFloat(duca.valorAduanaTotal || 0).toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(duca.estadoDocumento)}</span></td>
        <td>
          <button class="btn btn-sm btn-info" onclick="viewDucaDetails('${escapeHtml(duca.numeroDocumento)}')">
            👁️ Ver
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDucas() {
  const filterValue = document.getElementById('filterStatus')?.value;
  if (!filterValue || filterValue === 'TODOS') {
    displayDucasTable(allDucas);
  } else {
    const filtered = allDucas.filter(d => d.estadoDocumento === filterValue);
    displayDucasTable(filtered);
  }
}

function viewDucaDetails(numeroDocumento) {
  const duca = allDucas.find(d => d.numeroDocumento === numeroDocumento);
  if (!duca) return;

  const modal = document.getElementById('ducaModal');
  const details = document.getElementById('ducaDetails');
  
  details.innerHTML = `
    <div class="mb-3">
      <strong>Número de Documento:</strong> ${escapeHtml(duca.numeroDocumento)}
    </div>
    <div class="mb-3">
      <strong>Fecha de Emisión:</strong> ${new Date(duca.fechaEmision).toLocaleDateString('es-GT')}
    </div>
    <div class="mb-3">
      <strong>Tipo de Operación:</strong> ${escapeHtml(duca.tipoOperacion || '-')}
    </div>
    <div class="mb-3">
      <strong>Estado:</strong> <span class="badge badge-${duca.estadoDocumento.toLowerCase()}">${escapeHtml(duca.estadoDocumento)}</span>
    </div>
    <div class="mb-3">
      <strong>Valor Total:</strong> $${parseFloat(duca.valorAduanaTotal || 0).toLocaleString('es-GT', {minimumFractionDigits: 2})} ${escapeHtml(duca.moneda || 'USD')}
    </div>
    ${duca.comentarioRechazo ? `
    <div class="mb-3">
      <strong>Comentario de Rechazo:</strong>
      <div class="alert alert-warning mt-2">${escapeHtml(duca.comentarioRechazo)}</div>
    </div>
    ` : ''}
    <div class="mb-3">
      <strong>Datos Completos (JSON):</strong>
      <pre class="bg-light p-3 rounded mt-2" style="max-height: 300px; overflow-y: auto;">${escapeHtml(JSON.stringify(duca, null, 2))}</pre>
    </div>
  `;
  
  modal.style.display = 'block';
}

function closeModal() {
  const modal = document.getElementById('ducaModal');
  if (modal) modal.style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
  const modal = document.getElementById('ducaModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

// ========================================
// UTILIDADES
// ========================================

function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}