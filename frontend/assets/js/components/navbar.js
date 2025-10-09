// frontend/assets/js/components/navbar.js
import { clearAuthData, getUserRol, getUserName } from '../services/storage.service.js';

const renderNavbar = () => {
    const navbarContainer = document.getElementById('navbar-container');
    const rol = getUserRol() || 'Invitado';
    const userName = getUserName() || 'Usuario';

    if (!navbarContainer) return;

    navbarContainer.innerHTML = `
        <nav class="navbar">
            <div class="logo">SIGLAD - ${rol}</div>
            <div class="user-info">
                <span>Hola, ${userName}</span>
                <button id="logout-btn" class="btn-secondary">Cerrar Sesión</button>
            </div>
        </nav>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
        clearAuthData();
        window.location.href = '../pages/login.html';
    });
};

renderNavbar();