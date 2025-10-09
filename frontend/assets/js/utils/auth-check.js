// frontend/assets/js/utils/auth-check.js
import { getAccessToken, getUserRol, clearAuthData } from '../services/storage.service.js';
import { ROLE_PAGES } from '../config/api.config.js';

// Función para verificar la autenticación
const checkAuth = () => {
    const token = getAccessToken();
    const rol = getUserRol();
    const currentPagePath = window.location.pathname;

    // 1. Si no hay token, forzar al login
    if (!token) {
        if (!currentPagePath.includes('login.html')) {
            clearAuthData();
            window.location.href = '../pages/login.html';
        }
        return false;
    }

    // 2. Si hay token, verificar si el usuario tiene permiso para la página
    if (currentPagePath.includes('usuarios.html') || currentPagePath.includes('dashboard-admin.html')) {
        if (rol !== 'ADMINISTRADOR') {
            alert('Acceso no autorizado para tu rol.');
            const redirectPath = ROLE_PAGES[rol] || '../pages/dashboard-transportista.html';
            window.location.href = redirectPath;
        }
    }
    // ... Agregar lógica para otros roles/páginas

    return true;
};

// Ejecutar la verificación al cargar el script
checkAuth();