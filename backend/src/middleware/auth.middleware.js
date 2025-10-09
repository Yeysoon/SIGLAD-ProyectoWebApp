// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Middleware para verificar la validez del token JWT en la cabecera 'Authorization'.
 */
exports.verifyToken = (req, res, next) => {
    // 1. Obtener el token de la cabecera
    let token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ msg: 'Acceso denegado. No se proporcionó token.' });
    }

    // El formato es "Bearer <token>", así que lo separamos
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length).trimLeft();
    } else {
        return res.status(401).json({ msg: 'Formato de token inválido. Use Bearer.' });
    }

    try {
        // 2. Verificar y decodificar el token
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Adjuntar la información del usuario al objeto de la solicitud
        req.user = verified;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
             return res.status(401).json({ msg: 'Token expirado. Inicie sesión nuevamente.' });
        }
        res.status(400).json({ msg: 'Token inválido.' });
    }
};