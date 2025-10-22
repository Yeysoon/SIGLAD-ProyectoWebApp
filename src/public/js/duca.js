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
  // Modo JSON
  document.getElementById('btnPreload')?.addEventListener('click', preload);
  document.getElementById('btnPretty')?.addEventListener('click', pretty);
  document.getElementById('btnValidate')?.addEventListener('click', validateOnly);
  document.getElementById('btnSend')?.addEventListener('click', sendDUCA);
  
  // Tabs
  document.getElementById('tabJsonBtn')?.addEventListener('click', () => switchTab('json'));
  document.getElementById('tabFormBtn')?.addEventListener('click', () => switchTab('form'));
  
  // Modo Formulario
  document.getElementById('btnGenerateJSON')?.addEventListener('click', updateJSONPreview);
  document.getElementById('btnResetForm')?.addEventListener('click', resetForm);
  document.getElementById('btnValidateForm')?.addEventListener('click', validateForm);
  document.getElementById('ducaForm')?.addEventListener('submit', sendDUCAFromForm);
  document.getElementById('addMercancia')?.addEventListener('click', addMercancia);
  
  // Event delegation para eliminar mercancías
  document.addEventListener('click', (e) => {
    if (e.target.closest('.remove-mercancia')) {
      e.target.closest('.mercancia-item').remove();
      updateRemoveButtons();
      renumberMercancias();
    }
  });
  
  // Fecha actual por defecto
  const fechaInput = document.getElementById('fechaEmision');
  if (fechaInput) {
    fechaInput.valueAsDate = new Date();
  }
  
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
    roleInfo.textContent = user?.role ? ` ${user.role} | ${user.full_name || ''}` : '';
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
// FUNCIONES PARA TABS
// ========================================

function switchTab(tab) {
  const tabJsonBtn = document.getElementById('tabJsonBtn');
  const tabFormBtn = document.getElementById('tabFormBtn');
  const jsonTab = document.getElementById('jsonTab');
  const formTab = document.getElementById('formTab');
  
  if (tab === 'json') {
    tabJsonBtn?.classList.add('active');
    tabFormBtn?.classList.remove('active');
    jsonTab?.classList.add('active');
    formTab?.classList.remove('active');
  } else {
    tabJsonBtn?.classList.remove('active');
    tabFormBtn?.classList.add('active');
    jsonTab?.classList.remove('active');
    formTab?.classList.add('active');
  }
}

// ========================================
// FUNCIONES PARA duca.html - MODO JSON
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
// FUNCIONES PARA duca.html - MODO FORMULARIO
// ========================================

let mercanciaIndex = 1;

function generateJSONFromForm() {
  const mercancias = [];
  document.querySelectorAll('.mercancia-item').forEach((item, index) => {
    const desc = item.querySelector('.mercancia-desc').value;
    if (desc) {
      mercancias.push({
        linea: index + 1,
        descripcion: desc,
        cantidad: parseFloat(item.querySelector('.mercancia-cantidad').value) || 0,
        unidadMedida: item.querySelector('.mercancia-unidad').value || '',
        valorUnitario: parseFloat(item.querySelector('.mercancia-valor').value) || 0,
        paisOrigen: item.querySelector('.mercancia-origen').value || ''
      });
    }
  });

  const ducaData = {
    duca: {
      numeroDocumento: document.getElementById('numeroDocumento').value,
      fechaEmision: document.getElementById('fechaEmision').value,
      paisEmisor: document.getElementById('paisEmisor').value,
      tipoOperacion: document.getElementById('tipoOperacion').value,
      exportador: {
        idExportador: document.getElementById('idExportador').value,
        nombreExportador: document.getElementById('nombreExportador').value,
        direccionExportador: document.getElementById('direccionExportador').value,
        contactoExportador: {
          telefono: document.getElementById('telefonoExportador').value,
          email: document.getElementById('emailExportador').value
        }
      },
      importador: {
        idImportador: document.getElementById('idImportador').value,
        nombreImportador: document.getElementById('nombreImportador').value,
        direccionImportador: document.getElementById('direccionImportador').value,
        contactoImportador: {
          telefono: document.getElementById('telefonoImportador').value,
          email: document.getElementById('emailImportador').value
        }
      },
      transporte: {
        medioTransporte: document.getElementById('medioTransporte').value,
        placaVehiculo: document.getElementById('placaVehiculo').value,
        conductor: {
          nombreConductor: document.getElementById('nombreConductor').value,
          licenciaConductor: document.getElementById('licenciaConductor').value,
          paisLicencia: document.getElementById('paisLicencia').value
        },
        ruta: {
          aduanaSalida: document.getElementById('aduanaSalida').value,
          aduanaEntrada: document.getElementById('aduanaEntrada').value,
          paisDestino: document.getElementById('paisDestino').value,
          kilometrosAproximados: parseInt(document.getElementById('kilometrosAproximados').value) || 0
        }
      },
      mercancias: {
        numeroItems: mercancias.length,
        items: mercancias
      },
      valores: {
        valorFactura: parseFloat(document.getElementById('valorFactura').value) || 0,
        gastosTransporte: parseFloat(document.getElementById('gastosTransporte').value) || 0,
        seguro: parseFloat(document.getElementById('seguro').value) || 0,
        otrosGastos: parseFloat(document.getElementById('otrosGastos').value) || 0,
        valorAduanaTotal: parseFloat(document.getElementById('valorAduanaTotal').value) || 0,
        moneda: document.getElementById('moneda').value || 'USD'
      },
      resultadoSelectivo: {
        codigo: "R",
        descripcion: "Revisión documental"
      },
      estadoDocumento: "PENDIENTE",
      firmaElectronica: "AB12CD34EF56GH78"
    }
  };

  return ducaData;
}

function updateJSONPreview() {
  const json = generateJSONFromForm();
  const preview = document.getElementById('jsonPreview');
  if (preview) {
    preview.textContent = JSON.stringify(json, null, 2);
  }
}

function addMercancia() {
  const container = document.getElementById('mercanciasContainer');
  const firstItem = document.querySelector('.mercancia-item');
  if (!firstItem) return;
  
  const newItem = firstItem.cloneNode(true);
  
  mercanciaIndex++;
  newItem.dataset.index = mercanciaIndex;
  newItem.querySelector('.subsection-title').textContent = `Mercancía #${mercanciaIndex}`;
  newItem.querySelector('.remove-mercancia').style.display = 'inline-block';
  
  // Limpiar valores
  newItem.querySelectorAll('input').forEach(input => input.value = '');
  
  container.appendChild(newItem);
  updateRemoveButtons();
}

function updateRemoveButtons() {
  const items = document.querySelectorAll('.mercancia-item');
  items.forEach((item) => {
    const btn = item.querySelector('.remove-mercancia');
    if (btn) {
      btn.style.display = items.length > 1 ? 'inline-block' : 'none';
    }
  });
}

function renumberMercancias() {
  document.querySelectorAll('.mercancia-item').forEach((item, index) => {
    const title = item.querySelector('.subsection-title');
    if (title) {
      title.textContent = `Mercancía #${index + 1}`;
    }
  });
}

function resetForm() {
  if (confirm('¿Está seguro de limpiar todo el formulario?')) {
    const form = document.getElementById('ducaForm');
    if (form) form.reset();
    
    const preview = document.getElementById('jsonPreview');
    if (preview) preview.textContent = '{}';
    
    const statusForm = document.getElementById('statusForm');
    const valErrorsForm = document.getElementById('valErrorsForm');
    if (statusForm) statusForm.innerHTML = '';
    if (valErrorsForm) valErrorsForm.innerHTML = '';
    
    const serverResponse = document.getElementById('serverResponseForm');
    if (serverResponse) serverResponse.style.display = 'none';
    
    // Resetear fecha actual
    const fechaInput = document.getElementById('fechaEmision');
    if (fechaInput) fechaInput.valueAsDate = new Date();
  }
}

function validateForm() {
  const form = document.getElementById('ducaForm');
  const statusForm = document.getElementById('statusForm');
  const valErrorsForm = document.getElementById('valErrorsForm');
  
  if (!form) return;
  
  if (form.checkValidity()) {
    const json = generateJSONFromForm();
    const errors = [];
    
    if (!json.duca.numeroDocumento) errors.push('Falta número de documento');
    if (!json.duca.fechaEmision) errors.push('Falta fecha de emisión');
    if (!json.duca.tipoOperacion) errors.push('Falta tipo de operación');
    
    if (errors.length > 0) {
      if (valErrorsForm) {
        valErrorsForm.innerHTML = `<div class="alert alert-warning"><ul class="mb-0">${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
      }
      if (statusForm) {
        statusForm.innerHTML = '<span class="badge bg-warning">⚠️ Formulario incompleto</span>';
      }
    } else {
      if (valErrorsForm) {
        valErrorsForm.innerHTML = '<div class="alert alert-success">✅ Formulario válido. Puede proceder a enviar.</div>';
      }
      if (statusForm) {
        statusForm.innerHTML = '<span class="badge bg-success">✅ Validación exitosa</span>';
      }
    }
  } else {
    form.reportValidity();
    if (statusForm) {
      statusForm.innerHTML = '<span class="badge bg-danger">❌ Complete los campos requeridos</span>';
    }
  }
}

async function sendDUCAFromForm(e) {
  e.preventDefault();
  
  const jsonData = generateJSONFromForm();
  const statusForm = document.getElementById('statusForm');
  const valErrorsForm = document.getElementById('valErrorsForm');
  const serverOutForm = document.getElementById('serverOutForm');
  const serverResponseForm = document.getElementById('serverResponseForm');
  
  // Limpiar mensajes previos
  if (valErrorsForm) valErrorsForm.innerHTML = '';
  if (statusForm) {
    statusForm.innerHTML = '<span class="badge bg-warning"><i class="fas fa-spinner fa-spin"></i> Enviando...</span>';
  }
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      if (statusForm) {
        statusForm.innerHTML = '<span class="badge bg-danger">❌ No autenticado</span>';
      }
      setTimeout(() => location.replace('/index.html'), 1500);
      return;
    }

    const res = await fetch('/api/duca/recepcion', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(jsonData),
      cache: 'no-store'
    });
    
    const body = await res.json().catch(() => ({}));

    // Mostrar respuesta
    if (serverResponseForm) serverResponseForm.style.display = 'block';
    if (serverOutForm) {
      serverOutForm.textContent = JSON.stringify(body, null, 2);
    }

    if (!res.ok || !body.ok) {
      if (res.status === 400) {
        const details = body.details || [body.error || 'Solicitud inválida'];
        if (valErrorsForm) {
          valErrorsForm.innerHTML = `<div class="alert alert-danger"><ul class="mb-0">${details.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
        }
        if (statusForm) {
          statusForm.innerHTML = '<span class="badge bg-danger">❌ Verifique los campos obligatorios</span>';
        }
        return;
      }
      if (res.status === 409) {
        if (statusForm) {
          statusForm.innerHTML = '<span class="badge bg-warning">⚠️ DUCA ya registrada</span>';
        }
        if (valErrorsForm) {
          valErrorsForm.innerHTML = `<div class="alert alert-warning">${escapeHtml(body.error)}</div>`;
        }
        return;
      }
      if (res.status === 403) {
        if (statusForm) {
          statusForm.innerHTML = '<span class="badge bg-danger">❌ No autorizado (se requiere TRANSPORTISTA)</span>';
        }
        return;
      }
      if (statusForm) {
        statusForm.innerHTML = `<span class="badge bg-danger">❌ Error HTTP ${res.status}</span>`;
      }
      if (valErrorsForm) {
        valErrorsForm.innerHTML = `<div class="alert alert-danger">${escapeHtml(body.error || 'Error al registrar la declaración')}</div>`;
      }
      return;
    }

    if (statusForm) {
      statusForm.innerHTML = '<span class="badge bg-success"><i class="fas fa-check-circle"></i> ¡Declaración registrada correctamente!</span>';
    }
    
    // Opcional: Limpiar formulario después de envío exitoso
    setTimeout(() => {
      if (confirm('DUCA registrada exitosamente. ¿Desea crear otra DUCA?')) {
        resetForm();
      }
    }, 2000);
    
  } catch (err) {
    if (serverOutForm) {
      serverOutForm.textContent = String(err);
    }
    if (statusForm) {
      statusForm.innerHTML = '<span class="badge bg-danger">❌ Error de conexión</span>';
    }
    if (valErrorsForm) {
      valErrorsForm.innerHTML = '<div class="alert alert-danger">No se pudo conectar con el servidor</div>';
    }
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
    const statTotal = document.getElementById('statTotal');
    const statPendiente = document.getElementById('statPendiente');
    const statValidada = document.getElementById('statValidada');
    const statRechazada = document.getElementById('statRechazada');
    
    if (statTotal) statTotal.textContent = stats.total;
    if (statPendiente) statPendiente.textContent = stats.pendiente;
    if (statValidada) statValidada.textContent = stats.validada;
    if (statRechazada) statRechazada.textContent = stats.rechazada;

    // Mostrar últimas 5 DUCAs
    displayRecentDucas(ducas.slice(0, 5));

  } catch (err) {
    showDashboardError('Error al conectar con el servidor');
  }
}

function displayRecentDucas(ducas) {
  const recentList = document.getElementById('recentList');
  if (!recentList) return;
  
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
  if (!tableBody) return;
  
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
        <td>${parseFloat(duca.valorAduanaTotal || 0).toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(duca.estadoDocumento)}</span></td>
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

// ========================================
// UTILIDADES
// ========================================

function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}