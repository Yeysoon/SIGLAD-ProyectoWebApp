// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router(); // 🚨 CRÍTICO: Inicializa el objeto router
const authController = require('../controllers/auth.controller');
const { check } = require('express-validator');

// Reglas de validación para el login
const loginValidationRules = [
    check('usuario').not().isEmpty().withMessage('El nombre de usuario es requerido.'),
    // Nota: La validación completa ocurre en el controlador, esto es solo la sintaxis de express-validator
    check('password').isLength({ min: 1 }).withMessage('La contraseña es requerida.')
];

// POST /api/auth/login - Endpoint de Autenticación
router.post('/login', loginValidationRules, authController.login);

// POST /api/auth/logout - (Manejo en el cliente)
router.post('/logout', (req, res) => {
    res.json({ msg: 'Logout exitoso. Token eliminado en cliente.' });
});

module.exports = router; // 🚨 CRÍTICO: Exporta el objeto router