// frontend/assets/js/pages/usuarios.js
import { apiFetch } from '../services/api.service.js';

const tableBody = document.getElementById('users-table-body');
const modal = document.getElementById('user-modal');
const form = document.getElementById('user-form');
const modalTitle = document.getElementById('modal-title');
const alertDiv = document.getElementById('modal-alert');
const passwordGroup = form.querySelector('.password-group');

const fields = ['user-id', 'nombre', 'apellido', 'usuario', 'password', 'rol', 'estado'];
const getField = (id) => document.getElementById(id);

// --- Funciones de Utilidad ---
const toggleModal = (show = true) => modal.classList.toggle('hidden', !show);
const showAlert = (msg, isError = true) => {
    alertDiv.textContent = msg;
    alertDiv.classList.toggle('error', isError);
    alertDiv.classList.toggle('hidden', !msg);
};
const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

// --- Lógica del CRUD ---

const loadUsers = async () => {
    try {
        const data = await apiFetch('/usuarios');
        renderUsers(data.usuarios);
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Error al cargar usuarios.</td></tr>';
    }
};

const renderUsers = (users) => {
    tableBody.innerHTML = '';
    users.forEach(user => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${user.nombre} ${user.apellido}</td>
            <td>${user.usuario}</td>
            <td>${user.rol}</td>
            <td><span class="status ${user.estado.toLowerCase()}">${user.estado}</span></td>
            <td>${formatDate(user.fecha_creacion)}</td>
            <td>
                <button class="btn-action btn-edit" data-id="${user.id_usuario}">Editar</button>
                <button class="btn-action btn-toggle" data-id="${user.id_usuario}" data-estado="${user.estado}">
                    ${user.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                </button>
            </td>
        `;
    });
};

const openCreateModal = () => {
    modalTitle.textContent = 'Crear Nuevo Usuario';
    form.reset();
    getField('user-id').value = '';
    passwordGroup.style.display = 'block'; // Mostrar password para crear
    getField('password').required = true;
    showAlert('');
    toggleModal(true);
};

const openEditModal = async (id) => {
    try {
        const user = await apiFetch(`/usuarios/${id}`);
        modalTitle.textContent = `Editar Usuario: ${user.usuario}`;
        
        getField('user-id').value = user.id_usuario;
        getField('nombre').value = user.nombre;
        getField('apellido').value = user.apellido;
        getField('usuario').value = user.usuario;
        getField('rol').value = user.rol;
        getField('estado').value = user.estado;

        // Ocultar campo de contraseña y hacerlo opcional en edición
        passwordGroup.style.display = 'none'; 
        getField('password').required = false;

        showAlert('');
        toggleModal(true);
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        alert('No se pudieron cargar los datos del usuario.');
    }
};

const handleSubmit = async (e) => {
    e.preventDefault();
    showAlert('');

    const id = getField('user-id').value;
    const isEditing = !!id;
    
    const userData = {
        nombre: getField('nombre').value,
        apellido: getField('apellido').value,
        usuario: getField('usuario').value,
        rol: getField('rol').value,
        estado: getField('estado').value,
    };
    
    if (!isEditing) {
        userData.password = getField('password').value; // Solo se necesita en la creación
    }

    try {
        if (isEditing) {
            await apiFetch(`/usuarios/${id}`, { method: 'PUT', body: userData });
            showAlert('Usuario actualizado con éxito.', false);
        } else {
            await apiFetch('/usuarios', { method: 'POST', body: userData });
            showAlert('Usuario creado con éxito.', false);
        }
        
        setTimeout(() => {
            toggleModal(false);
            loadUsers(); // Recargar la lista
        }, 1000);

    } catch (error) {
        console.error('Error en la operación:', error);
        const msg = error.details ? error.details.map(d => d.msg).join('; ') : (error.msg || 'Error desconocido.');
        showAlert(msg);
    }
};

const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    if (!confirm(`¿Estás seguro de que quieres cambiar el estado a ${newStatus}?`)) {
        return;
    }

    try {
        await apiFetch(`/usuarios/${id}/status`, { 
            method: 'PUT', 
            body: { estado: newStatus } 
        });
        alert(`Usuario ${id} actualizado a ${newStatus}.`);
        loadUsers(); // Recargar la lista
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        alert('Error al cambiar el estado del usuario.');
    }
};

// --- Event Listeners ---
document.getElementById('add-user-btn').addEventListener('click', openCreateModal);
document.querySelector('.close-btn').addEventListener('click', () => toggleModal(false));
modal.addEventListener('click', (e) => {
    if (e.target === modal) toggleModal(false);
});
form.addEventListener('submit', handleSubmit);
tableBody.addEventListener('click', (e) => {
    const target = e.target;
    const id = target.dataset.id;
    
    if (target.classList.contains('btn-edit')) {
        openEditModal(id);
    } else if (target.classList.contains('btn-toggle')) {
        const currentStatus = target.dataset.estado;
        handleToggleStatus(id, currentStatus);
    }
});


// Inicialización
document.addEventListener('DOMContentLoaded', loadUsers);