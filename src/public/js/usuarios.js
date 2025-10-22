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

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.replace('/index.html');
}

// ELEMENTOS DEL DOM
const form = document.getElementById('formNew');
const tblBody = document.querySelector('#tblUsers tbody');
const statusEl = document.getElementById('status');

// LOGOUT
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

// Esperar a que Swal esté disponible
function esperarSwal() {
  return new Promise((resolve) => {
    if (typeof Swal !== 'undefined') {
      resolve();
    } else {
      const interval = setInterval(() => {
        if (typeof Swal !== 'undefined') {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => clearInterval(interval), 5000);
    }
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
    const res = await API.create(body);
    console.log('Respuesta:', res);

    // Restaurar botón
    submitBtn.innerHTML = originalBtnHTML;
    submitBtn.disabled = false;

    if (!res.ok) {
      if (statusEl) {
        statusEl.innerHTML =
          '<span class="badge bg-danger"><i class="fas fa-times-circle"></i> Error al crear el correo ya existe</span>';
      }

      try {
        await esperarSwal();
        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'error',
            title: 'Error al crear usuario',
            text: res.error || 'No se pudo crear el usuario',
            confirmButtonColor: '#e74c3c',
            confirmButtonText: 'Entendido',
          });
        } else {
          alert('Error: ' + (res.error || 'No se pudo crear el usuario'));
        }
      } catch (e) {
        alert('Error: ' + (res.error || 'No se pudo crear el usuario'));
      }
      return;
    }

    // ÉXITO - Mostrar notificación
    if (statusEl) {
      statusEl.innerHTML =
        '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Usuario creado exitosamente</span>';
    }

    try {
      await esperarSwal();
      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'success',
          title: '¡Usuario Creado!',
          html: `
            <p>El usuario <strong>${body.full_name}</strong> ha sido creado exitosamente.</p>
            <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">
              <i class="fas fa-envelope"></i> ${body.email}<br>
              <i class="fas fa-user-tag"></i> Rol: ${body.role_code}
            </p>
          `,
          confirmButtonColor: '#2ecc71',
          confirmButtonText: 'Ir a Lista de Usuarios',
          showCancelButton: true,
          cancelButtonText: 'Crear Otro',
          cancelButtonColor: '#3498db',
        }).then((result) => {
          if (result.isConfirmed) {
            // Ir a listar usuarios
            location.href = 'listarUsuarios.html';
          } else {
            // Limpiar formulario para crear otro
            form.reset();
            document.getElementById('is_active').value = 'true';
            if (statusEl) statusEl.innerHTML = '';
          }
        });
      } else {
        // Fallback sin SweetAlert2
        alert(
          '✅ Usuario creado correctamente:\n\n' +
            'Nombre: ' +
            body.full_name +
            '\n' +
            'Email: ' +
            body.email +
            '\n' +
            'Rol: ' +
            body.role_code
        );

        if (confirm('¿Desea ir a la lista de usuarios?')) {
          location.href = 'listarUsuarios.html';
        } else {
          form.reset();
          document.getElementById('is_active').value = 'true';
          if (statusEl) statusEl.innerHTML = '';
        }
      }
    } catch (e) {
      // Si falla SweetAlert, usar alert simple
      alert('✅ Usuario creado correctamente');
      setTimeout(() => {
        location.href = 'listarUsuarios.html';
      }, 1500);
    }
  });
}

// CARGAR USUARIOS - En listarUsuarios.html
async function loadUsers() {
  if (statusEl) statusEl.textContent = 'Cargando usuarios...';

  const res = await API.list();
  console.log('Lista de usuarios:', res);

  if (!res.ok) {
    if (statusEl) statusEl.textContent = res.error || 'Error al cargar';
    if (res.error && /Token/.test(res.error)) {
      logout();
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
}

// CARGAR ESTADÍSTICAS - En usuarios.html dashboard
async function loadStats() {
  try {
    console.log('Cargando estadísticas...');
    const res = await API.list();
    console.log('Respuesta stats:', res);

    if (!res.ok) {
      console.error('Error en stats:', res.error);
      if (res.error && /Token/.test(res.error)) logout();
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
          ${['ADMIN', 'TRANSPORTISTA', 'IMPORTADOR', 'AGENTE']
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

      // Cambiar botón a estado de carga
      const btnOriginalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
      btn.disabled = true;

      const res = await API.update(id, payload);
      console.log('Respuesta actualización:', res);

      // Restaurar botón
      btn.innerHTML = btnOriginalHTML;
      btn.disabled = false;

      if (!res.ok) {
        try {
          await esperarSwal();
          if (typeof Swal !== 'undefined') {
            await Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res.error || 'No se pudo actualizar',
              confirmButtonColor: '#e74c3c',
            });
          } else {
            alert('Error: ' + (res.error || 'No se pudo actualizar'));
          }
        } catch (e) {
          alert('Error: ' + (res.error || 'No se pudo actualizar'));
        }
        if (statusEl) statusEl.textContent = res.error || 'Error al actualizar';
        return;
      }

      try {
        await esperarSwal();
        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'success',
            title: '¡Actualizado!',
            text: 'Usuario actualizado correctamente',
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          // Mostrar feedback visual sin alert
          btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
          setTimeout(() => {
            btn.innerHTML = btnOriginalHTML;
          }, 2000);
        }
      } catch (e) {
        console.log('Swal no disponible, mostrando feedback visual');
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
        setTimeout(() => {
          btn.innerHTML = btnOriginalHTML;
        }, 2000);
      }

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
