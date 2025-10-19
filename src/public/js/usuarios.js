const API = {
  list:  () => fetch('/api/users', { headers: authHeaders() }).then(r => r.json()),
  create:(body) => fetch('/api/users', { method:'POST', headers: { ...authHeaders(), 'Content-Type':'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  update:(id, body) => fetch(`/api/users/${id}`, { method:'PUT', headers: { ...authHeaders(), 'Content-Type':'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  del:   (id) => fetch(`/api/users/${id}`, { method:'DELETE', headers: authHeaders() }).then(r => r.json())
};

function authHeaders() {
  const t = localStorage.getItem('token');
  if (!t) { location.replace('/index.html'); return {}; }
  return { 'Authorization': `Bearer ${t}` };
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
const btnReload = document.getElementById('btnReload');

// LOGOUT - En cualquier página (buscar en links del sidebar)
document.addEventListener('click', (e) => {
  if (e.target.textContent.includes('Cerrar sesión') || e.target.closest('[onclick*="logout"]')) {
    logout();
  }
});

// Alternativa directa - si hay botón btnLogout
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', logout);
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
    
    if (statusEl) statusEl.textContent = 'Creando...';
    
    const body = {
      full_name:  document.getElementById('full_name').value.trim(),
      email:      document.getElementById('email').value.trim(),
      role_code:  document.getElementById('role_code').value,
      is_active:  document.getElementById('is_active').value === 'true',
      password:   document.getElementById('password').value
    };

    console.log('Enviando:', body);
    const res = await API.create(body);
    console.log('Respuesta:', res);
    
    if (!res.ok) {
      if (statusEl) statusEl.textContent = res.error || 'Error al crear';
      try {
        await esperarSwal();
        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: res.error || 'No se pudo crear el usuario'
          });
        }
      } catch (e) {
        alert('Error: ' + (res.error || 'No se pudo crear el usuario'));
      }
      return;
    }
    
    try {
      await esperarSwal();
      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Usuario creado correctamente',
          timer: 2000
        });
      }
    } catch (e) {
      alert('Usuario creado correctamente');
    }
    
    form.reset();
    document.getElementById('is_active').value = 'true';
    
    setTimeout(() => {
      location.href = 'listarUsuarios.html';
    }, 2000);
  });
}

// CARGAR USUARIOS - En listarUsuarios.html
async function loadUsers() {
  if (statusEl) statusEl.textContent = 'Cargando...';
  
  const res = await API.list();
  console.log('Lista de usuarios:', res);
  
  if (!res.ok) {
    if (statusEl) statusEl.textContent = res.error || 'Error al cargar';
    if (res.error && /Token/.test(res.error)) {
      logout();
    }
    return;
  }
  
  if (statusEl) statusEl.textContent = '';
  renderUsers(res.users || []);
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
    const active = users.filter(u => u.is_active).length;
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
  
  tblBody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><input class="form-control form-control-sm" value="${escapeHtml(u.full_name)}" data-k="full_name"></td>
      <td><input class="form-control form-control-sm" value="${escapeHtml(u.email)}" data-k="email"></td>
      <td>
        <select class="form-select form-select-sm" data-k="role_code">
          ${['ADMIN','IMPORTADOR','AGENTE','TRANSPORTISTA'].map(rc => `<option value="${rc}" ${rc===u.role_code?'selected':''}>${rc}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="form-select form-select-sm" data-k="is_active">
          <option value="true" ${u.is_active?'selected':''}>Activo</option>
          <option value="false" ${!u.is_active?'selected':''}>Inactivo</option>
        </select>
      </td>
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-success" data-act="save" data-id="${u.id}">Guardar</button>
        <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${u.id}">Desactivar</button>
      </td>
    `;
    tblBody.appendChild(tr);
  });
}

// EVENT LISTENER PARA TABLA
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
      
      const res = await API.update(id, payload);
      console.log('Respuesta actualización:', res);
      
      if (!res.ok) {
        try {
          await esperarSwal();
          if (typeof Swal !== 'undefined') {
            await Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res.error || 'No se pudo actualizar'
            });
          } else {
            alert('Error: ' + (res.error || 'No se pudo actualizar'));
          }
        } catch (e) {
          alert('Error: ' + (res.error || 'No se pudo actualizar'));
        }
        if (statusEl) statusEl.textContent = res.error || 'Error';
        return;
      }

      try {
        await esperarSwal();
        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'success',
            title: '¡Actualizado!',
            text: 'Usuario actualizado correctamente',
            timer: 1500
          });
        } else {
          alert('Usuario actualizado correctamente');
        }
      } catch (e) {
        console.log('Swal no disponible, continuando');
      }

      if (statusEl) statusEl.textContent = 'Actualizado';
      loadUsers();
    }

    // DESACTIVAR
    if (btn.dataset.act === 'del') {
      console.log('Click en desactivar, id:', id);
      
      try {
        await esperarSwal();
        
        let confirmado = false;
        
        if (typeof Swal !== 'undefined') {
          const result = await Swal.fire({
            icon: 'warning',
            title: '¿Desactivar usuario?',
            text: 'Esta acción desactivará al usuario del sistema',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar'
          });
          confirmado = result.isConfirmed;
          console.log('Resultado de confirmación:', confirmado);
        } else {
          confirmado = window.confirm('¿Desactivar usuario? Esta acción es irreversible.');
          console.log('Confirmado con window.confirm:', confirmado);
        }
        
        if (!confirmado) {
          console.log('Usuario canceló la desactivación');
          return;
        }

        console.log('Enviando DELETE a /api/users/' + id);
        const res = await API.del(id);
        console.log('Respuesta DELETE completa:', res);
        console.log('¿res.ok?:', res.ok);
        
        if (!res.ok) {
          console.error('Error en respuesta:', res.error);
          if (typeof Swal !== 'undefined') {
            await Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res.error || 'No se pudo desactivar'
            });
          } else {
            alert('Error: ' + (res.error || 'No se pudo desactivar'));
          }
          if (statusEl) statusEl.textContent = res.error || 'Error';
          return;
        }

        console.log('Desactivación exitosa');
        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'success',
            title: '¡Desactivado!',
            text: 'Usuario desactivado correctamente',
            timer: 1500
          });
        } else {
          alert('Usuario desactivado correctamente');
        }

        if (statusEl) statusEl.textContent = 'Usuario desactivado';
        loadUsers();
      } catch (error) {
        console.error('Error en desactivación:', error);
        alert('Error: ' + error.message);
      }
    }
  });
}

// BOTON RECARGAR
if (btnReload) {
  btnReload.addEventListener('click', () => {
    loadUsers();
  });
}

function pickRow(tr) {
  const get = (k) => tr.querySelector(`[data-k="${k}"]`);
  return {
    full_name: get('full_name').value.trim(),
    email: get('email').value.trim(),
    role_code: get('role_code').value,
    is_active: get('is_active').value === 'true'
  };
}

function escapeHtml(s='') {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// EJECUTAR AL CARGAR
document.addEventListener('DOMContentLoaded', () => {
  console.log('Usuario.js cargado');
  
  // Si estamos en la tabla de usuarios
  if (tblBody) {
    loadUsers();
  }
  
  // Si estamos en el dashboard
  if (document.getElementById('totalUsers')) {
    loadStats();
  }
});