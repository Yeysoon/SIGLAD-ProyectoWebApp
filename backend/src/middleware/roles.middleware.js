// backend/src/middleware/roles.middleware.js

/**
 * Middleware para verificar si el usuario tiene uno de los roles requeridos.
 * * @param {Array<string>} rolesPermitidos - Lista de roles que pueden acceder.
 * @returns {Function} Middleware de Express.
 */
exports.hasRole = (rolesPermitidos) => {
    return (req, res, next) => {
        // 1. Verificar si verifyToken funcionó y adjuntó el usuario
        if (!req.user || !req.user.rol) {
            // Esto no debería suceder si verifyToken va primero, pero es una buena medida de seguridad.
            return res.status(403).json({ msg: 'Acceso denegado. No se encontró información del rol.' });
        }

        const userRole = req.user.rol;

        // 2. Verificar si el rol del usuario está incluido en los roles permitidos
        if (rolesPermitidos.includes(userRole)) {
            next(); // El rol es permitido, continuar
        } else {
            // 403: Prohibido (No tiene el rol necesario)
            return res.status(403).json({ msg: `Acceso denegado. Rol de usuario (${userRole}) no autorizado para esta operación.` });
        }
    };
};