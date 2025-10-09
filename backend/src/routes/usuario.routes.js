// backend/src/routes/usuario.routes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { hasRole } = require('../middleware/roles.middleware');

// Middleware de protección: Todas las rutas de usuarios requieren token
router.use(verifyToken);
// 🚨 Seguridad: Todas las rutas CRUD de usuarios requieren rol ADMINISTRADOR
router.use(hasRole(['ADMINISTRADOR'])); 


// ==================================================
// CU-02: Gestión de Usuarios (CRUD)
// ==================================================

// GET /api/usuarios - Listar todos los usuarios
router.get('/', usuarioController.listUsuarios);

// POST /api/usuarios - Crear nuevo usuario
router.post('/', usuarioController.createUsuario);

// GET /api/usuarios/:id - Obtener detalle
router.get('/:id', usuarioController.getUsuario);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', usuarioController.updateUsuario);

// DELETE /api/usuarios/:id - Eliminar usuario
router.delete('/:id', usuarioController.deleteUsuario);


module.exports = router;