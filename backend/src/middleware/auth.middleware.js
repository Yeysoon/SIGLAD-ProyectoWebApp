// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar la validez del token JWT.
 * Agrega el payload del token (id, usuario, rol) a req.user.
 */
exports.verifyToken = (req, res, next) => {
    // 1. Obtener el token del header (Bearer Token)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // 401: No autorizado (token no proporcionado)
        return res.status(401).json({ msg: 'Acceso denegado. No se proporcionó token de autenticación.' });
    }

    // 2. Extraer solo el token
    const token = authHeader.split(' ')[1];

    try {
        // 3. Verificar el token usando la clave secreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Inyectar los datos del usuario decodificado en el objeto request
        req.user = decoded; 
        
        // El payload decodificado tendrá: { id: 1, usuario: 'correo@ej.com', rol: 'ADMINISTRADOR', iat: ..., exp: ... }
        
        next(); // Continuar con la siguiente función (ej. roles.middleware.js)

    } catch (err) {
        // Si el token es inválido (expirado, modificado, etc.)
        // 403: Prohibido (token inválido)
        return res.status(403).json({ msg: 'Token inválido o expirado. Vuelva a iniciar sesión.' });
    }
};