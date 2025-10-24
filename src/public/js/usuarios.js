const API = {
  list: () =>
    fetch('/api/users', { headers: authHeaders() }).then((r) => r.json()),
  create: (body) =>
    fetch('/api/users', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  update: (id, body) =>
    fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  del: (id) =>
    fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then((r) => r.json()),
};

function authHeaders() {
  const t = localStorage.getItem('token');
  if (!t) {
    location.replace('/index.html');
    return {};
  }
  return { Authorization: `Bearer ${t}` };
}

// LOGOUT CON SWEETALERT2
function logout() {
  Swal.fire({
    title: '¿Cerrar Sesión?',
    text: '¿Está seguro que desea salir del sistema?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3498db',
    cancelButtonColor: '#95a5a6',
    confirmButtonText: '<i class="fas fa-sign-out-alt"></i> Sí, cerrar sesión',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      Swal.fire({
        icon: 'success',
        title: 'Sesión Cerrada',
        text: 'Hasta pronto',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        location.replace('/index.html');
      });
    }
  });
}

// ELEMENTOS DEL DOM
const form = document.getElementById('formNew');
const tblBody = document.querySelector('#tblUsers tbody');
const statusEl = document.getElementById('status');

// LOGOUT - CORRECCIÓN: usar 'click' en vez de 'onclick'
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', (e) => {  // ✅ CORRECTO
    e.preventDefault();
    logout();
  });
}

// EVENTO DEL FORMULARIO - En crearUsuarios.html
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Cambiar el botón a estado de carga
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    submitBtn.disabled = true;

    if (statusEl) {
      statusEl.innerHTML =
        '<span class="badge bg-warning"><i class="fas fa-spinner fa-spin"></i> Procesando...</span>';
    }

    const body = {
      full_name: document.getElementById('full_name').value.trim(),
      email: document.getElementById('email').value.trim(),
      role_code: document.getElementById('role_code').value,
      is_active: document.getElementById('is_active').value === 'true',
      password: document.getElementById('password').value,
    };

    console.log('Enviando:', body);
    
    // Mostrar loading
    Swal.fire({
      title: 'Creando Usuario',
      text: 'Por favor espere...',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const res = await API.create(body);
    console.log('Respuesta:', res);

    // Restaurar botón
    submitBtn.innerHTML = originalBtnHTML;
    submitBtn.disabled = false;

    if (!res.ok) {
      if (statusEl) {
        statusEl.innerHTML =
          '<span class="badge bg-danger"><i class="fas fa-times-circle"></i> Error al crear</span>';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error al Crear Usuario',
        text: res.error || 'El correo ya existe o hay un problema con los datos',
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    // ÉXITO - Mostrar notificación
    if (statusEl) {
      statusEl.innerHTML =
        '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Usuario creado exitosamente</span>';
    }

    Swal.fire({
      icon: 'success',
      title: '¡Usuario Creado!',
      html: `
        <div style="text-align: left; padding: 20px;">
          <p style="margin-bottom: 15px;">El usuario ha sido creado exitosamente:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60;">
            <p style="margin: 5px 0;"><i class="fas fa-user" style="width: 20px; color: #3498db;"></i> <strong>${escapeHtml(body.full_name)}</strong></p>
            <p style="margin: 5px 0;"><i class="fas fa-envelope" style="width: 20px; color: #3498db;"></i> ${escapeHtml(body.email)}</p>
            <p style="margin: 5px 0;"><i class="fas fa-user-tag" style="width: 20px; color: #3498db;"></i> Rol: <strong>${body.role_code}</strong></p>
            <p style="margin: 5px 0;"><i class="fas fa-circle" style="width: 20px; color: ${body.is_active ? '#27ae60' : '#e74c3c'};"></i> Estado: ${body.is_active ? 'Activo' : 'Inactivo'}</p>
          </div>
        </div>
      `,
      confirmButtonColor: '#27ae60',
      confirmButtonText: '<i class="fas fa-list"></i> Ir a Lista de Usuarios',
      showCancelButton: true,
      cancelButtonText: '<i class="fas fa-plus"></i> Crear Otro',
      cancelButtonColor: '#3498db',
    }).then((result) => {
      if (result.isConfirmed) {
        location.href = 'listarUsuarios.html';
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        form.reset();
        document.getElementById('is_active').value = 'true';
        if (statusEl) statusEl.innerHTML = '';
      }
    });
  });
}

// CARGAR USUARIOS - En listarUsuarios.html
async function loadUsers() {
  if (statusEl) statusEl.textContent = 'Cargando usuarios...';

  // Mostrar loading
  Swal.fire({
    title: 'Cargando Usuarios',
    text: 'Obteniendo lista de usuarios...',
    icon: 'info',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const res = await API.list();
  console.log('Lista de usuarios:', res);

  Swal.close();

  if (!res.ok) {
    if (statusEl) statusEl.textContent = res.error || 'Error al cargar';
    
    if (res.error && /Token/.test(res.error)) {
      Swal.fire({
        icon: 'warning',
        title: 'Sesión Expirada',
        text: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
        confirmButtonColor: '#3498db'
      }).then(() => {
        logout();
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error al Cargar',
        text: res.error || 'No se pudo obtener la lista de usuarios',
        confirmButtonColor: '#e74c3c'
      });
    }
    return;
  }

  const users = res.users || [];
  if (statusEl) {
    statusEl.textContent = `Total: ${users.length} usuario${
      users.length !== 1 ? 's' : ''
    }`;
  }

  renderUsers(users);
  
  if (users.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Sin Usuarios',
      text: 'No hay usuarios registrados en el sistema',
      confirmButtonColor: '#3498db'
    });
  }
}

// CARGAR ESTADÍSTICAS - En usuarios.html dashboard
async function loadStats() {
  try {
    console.log('Cargando estadísticas...');
    const res = await API.list();
    console.log('Respuesta stats:', res);

    if (!res.ok) {
      console.error('Error en stats:', res.error);
      if (res.error && /Token/.test(res.error)) {
        Swal.fire({
          icon: 'warning',
          title: 'Sesión Expirada',
          text: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
          confirmButtonColor: '#3498db'
        }).then(() => {
          logout();
        });
      }
      return;
    }

    const users = res.users || [];
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const inactive = total - active;

    console.log('Total:', total, 'Activos:', active, 'Inactivos:', inactive);

    const totalEl = document.getElementById('totalUsers');
    const activeEl = document.getElementById('activeUsers');
    const inactiveEl = document.getElementById('inactiveUsers');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (inactiveEl) inactiveEl.textContent = inactive;
  } catch (error) {
    console.error('Error en loadStats:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al Cargar Estadísticas',
      text: 'No se pudieron obtener las estadísticas del sistema',
      confirmButtonColor: '#e74c3c'
    });
  }
}

// RENDERIZAR TABLA
function renderUsers(users) {
  if (!tblBody) return;

  if (users.length === 0) {
    tblBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="fas fa-users-slash"></i>
          <h4>No hay usuarios registrados</h4>
          <p>Comienza creando el primer usuario del sistema</p>
        </td>
      </tr>
    `;
    return;
  }

  tblBody.innerHTML = '';
  users.forEach((u) => {
    const roleBadgeClass =
      {
        ADMIN: 'badge-admin',
        TRANSPORTISTA: 'badge-transportista',
        IMPORTADOR: 'badge-importador',
        AGENTE: 'badge-agente',
      }[u.role_code] || 'badge-agente';

    const statusBadgeClass = u.is_active ? 'badge-activo' : 'badge-inactivo';
    const statusText = u.is_active ? 'Activo' : 'Inactivo';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="user-id">${u.id}</span></td>
      <td>
        <input class="form-control form-control-sm" value="${escapeHtml(
          u.full_name
        )}" data-k="full_name">
      </td>
      <td>
        <input class="form-control form-control-sm" value="${escapeHtml(
          u.email
        )}" data-k="email" type="email">
      </td>
      <td>
        <select class="form-select form-select-sm" data-k="role_code">
          ${['ADMIN', 'TRANSPORTISTA', 'AGENTE']
            .map(
              (rc) =>
                `<option value="${rc}" ${
                  rc === u.role_code ? 'selected' : ''
                }>${rc}</option>`
            )
            .join('')}
        </select>
      </td>
      <td>
        <select class="form-select form-select-sm" data-k="is_active">
          <option value="true" ${u.is_active ? 'selected' : ''}>Activo</option>
          <option value="false" ${
            !u.is_active ? 'selected' : ''
          }>Inactivo</option>
        </select>
      </td>
      <td style="text-align: center;">
        <button class="btn-action btn-save" data-act="save" data-id="${u.id}">
          <i class="fas fa-save"></i>
          Guardar
        </button>
      </td>
    `;
    tblBody.appendChild(tr);
  });
}

// EVENT LISTENER PARA TABLA - Solo botón Guardar
if (tblBody) {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;

    const id = btn.dataset.id;
    const tr = btn.closest('tr');

    // GUARDAR
    if (btn.dataset.act === 'save') {
      const payload = pickRow(tr);
      console.log('Actualizando usuario', id, ':', payload);

      // Confirmación antes de guardar
      const result = await Swal.fire({
        title: '¿Guardar Cambios?',
        html: `
          <div style="text-align: left;">
            <p>Se actualizará el usuario con los siguientes datos:</p>
            <ul style="list-style: none; padding: 10px; background: #f8f9fa; border-radius: 5px;">
              <li><i class="fas fa-user"></i> <strong>Nombre:</strong> ${escapeHtml(payload.full_name)}</li>
              <li><i class="fas fa-envelope"></i> <strong>Email:</strong> ${escapeHtml(payload.email)}</li>
              <li><i class="fas fa-user-tag"></i> <strong>Rol:</strong> ${payload.role_code}</li>
              <li><i class="fas fa-circle" style="color: ${payload.is_active ? '#27ae60' : '#e74c3c'}"></i> <strong>Estado:</strong> ${payload.is_active ? 'Activo' : 'Inactivo'}</li>
            </ul>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3498db',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: '<i class="fas fa-check"></i> Sí, guardar',
        cancelButtonText: 'Cancelar'
      });

      if (!result.isConfirmed) return;

      // Cambiar botón a estado de carga
      const btnOriginalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
      btn.disabled = true;

      // Mostrar loading
      Swal.fire({
        title: 'Actualizando Usuario',
        text: 'Por favor espere...',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const res = await API.update(id, payload);
      console.log('Respuesta actualización:', res);

      // Restaurar botón
      btn.innerHTML = btnOriginalHTML;
      btn.disabled = false;

      if (!res.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Error al Actualizar',
          text: res.error || 'No se pudo actualizar el usuario',
          confirmButtonColor: '#e74c3c',
        });
        if (statusEl) statusEl.textContent = res.error || 'Error al actualizar';
        return;
      }

      // Éxito
      Swal.fire({
        icon: 'success',
        title: '¡Usuario Actualizado!',
        html: `
          <p>Los datos del usuario han sido actualizados correctamente</p>
          <p style="font-weight: bold; color: #27ae60; margin-top: 10px;">${escapeHtml(payload.full_name)}</p>
        `,
        timer: 2000,
        showConfirmButton: false,
      });

      if (statusEl) statusEl.textContent = 'Usuario actualizado correctamente';

      // Recargar después de 1 segundo
      setTimeout(() => {
        loadUsers();
      }, 1000);
    }
  });
}

function pickRow(tr) {
  const get = (k) => tr.querySelector(`[data-k="${k}"]`);
  return {
    full_name: get('full_name').value.trim(),
    email: get('email').value.trim(),
    role_code: get('role_code').value,
    is_active: get('is_active').value === 'true',
  };
}

function escapeHtml(s = '') {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        m
      ])
  );
}

// EJECUTAR AL CARGAR
document.addEventListener('DOMContentLoaded', () => {
  console.log('Usuarios.js cargado');

  // Si estamos en la tabla de usuarios
  if (tblBody) {
    loadUsers();
  }

  // Si estamos en el dashboard
  if (document.getElementById('totalUsers')) {
    loadStats();
  }
});