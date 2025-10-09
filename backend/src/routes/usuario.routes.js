// backend/src/routes/usuario.routes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { hasRole } = require('../middleware/roles.middleware');

// ==================================================
// Middleware de protección para TODAS las rutas de usuarios
// Solo el ADMINISTRADOR puede acceder (CU-02)
// Aplicamos primero la verificación del token, luego la verificación del rol.
router.use(verifyToken);
router.use(hasRole(['ADMINISTRADOR']));
// ==================================================

// GET /api/usuarios - Listar usuarios
router.get('/', usuarioController.listUsuarios);

// POST /api/usuarios - Crear nuevo usuario
router.post('/', usuarioController.createUsuario);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', usuarioController.updateUsuario);

// DELETE /api/usuarios/:id - Eliminar/Inactivar usuario
router.delete('/:id', usuarioController.deleteUsuario);

module.exports = router;