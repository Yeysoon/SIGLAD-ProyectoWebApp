// backend/src/controllers/auth.controller.js
const Usuario = require('../models/usuario.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

/**
 * POST /api/auth/login - Maneja el inicio de sesión (CU-01).
 */
exports.login = async (req, res, next) => {
    // 1. Validar errores de express-validator (si hay)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ msg: 'Datos de inicio de sesión incompletos o incorrectos.', errores: errors.array() });
    }

    const { usuario, password } = req.body;

    try {
        // 2. Buscar el usuario en la base de datos
        const user = await Usuario.findByUsername(usuario);

        if (!user) {
            return res.status(401).json({ msg: 'Credenciales inválidas. Usuario no encontrado.' });
        }
        
        if (user.estado !== 'ACTIVO') {
             return res.status(403).json({ msg: 'La cuenta de usuario está inactiva.' });
        }

        // 3. Comparar la contraseña hasheada
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ msg: 'Credenciales inválidas. Contraseña incorrecta.' });
        }

        // 4. Generar el Token JWT
        const payload = {
            id: user.id_usuario,
            usuario: user.usuario,
            rol: user.rol,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        // 5. Responder con el token y datos del usuario
        res.json({
            msg: 'Inicio de sesión exitoso.',
            token,
            user: {
                id: user.id_usuario,
                usuario: user.usuario,
                rol: user.rol,
                nombre: user.nombre || 'N/A' // Asegúrate de que tu modelo devuelva el nombre si es necesario
            }
        });

    } catch (error) {
        // Enviar error al middleware de manejo global
        next(error); 
    }
};

// 🚨 CRÍTICO: La función 'login' se exporta aquí.