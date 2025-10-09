// backend/src/middleware/roles.middleware.js

/**
 * Middleware para verificar si el usuario tiene alguno de los roles permitidos.
 * Se debe usar DESPUÉS de verifyToken.
 * @param {Array<string>} roles - Un array de roles permitidos (ej: ['ADMINISTRADOR', 'TRANSPORTISTA'])
 */
exports.hasRole = (roles) => {
    return (req, res, next) => {
        // req.user viene del verifyToken
        if (!req.user || !req.user.rol) {
            return res.status(500).json({ msg: 'Error de servidor: No hay información de rol en el token.' });
        }

        if (roles.includes(req.user.rol)) {
            next(); // El usuario tiene un rol permitido
        } else {
            return res.status(403).json({ 
                msg: `Acceso prohibido. Rol requerido: ${roles.join(', ')}. Su rol es: ${req.user.rol}` 
            });
        }
    };
};