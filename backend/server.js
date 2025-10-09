// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv'); // 🚨 La importación debe estar aquí

// Configurar variables de entorno (incluye DB)
dotenv.config(); // 🚨 La llamada a .config() debe estar DESPUÉS de la importación
require('./src/config/database'); // Inicializa la conexión a la DB

// Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/usuario.routes'); 
const declaracionRoutes = require('./src/routes/declaracion.routes'); 
const validacionRoutes = require('./src/routes/validacion.routes');
const bitacoraRoutes = require('./src/routes/bitacora.routes'); 

// Inicialización de Express
const app = express(); 
const PORT = process.env.PORT || 5000;

// --- Middlewares de Seguridad y Logs ---
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' })); 
app.use(morgan('dev')); 
app.use(express.json()); 

// --- Rutas del API ---
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido al API REST de SIGLAD. Accede a /api/<ruta>' });
});

app.use('/api/auth', authRoutes); 
app.use('/api/usuarios', userRoutes); 
app.use('/api/declaraciones', declaracionRoutes);
app.use('/api/validacion', validacionRoutes); 
app.use('/api/bitacora', bitacoraRoutes); 

// --- Manejo de Errores Global ---
app.use((err, req, res, next) => {
    console.error(err.stack); 
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        msg: err.message || 'Ocurrió un error interno del servidor.',
        status: statusCode
    });
});

// --- Iniciar Servidor ---
app.listen(PORT, () => {
    // 🚨 Este mensaje SÓLO aparece si no hay errores antes de app.listen
    console.log(`🚀 Servidor SIGLAD corriendo en http://localhost:${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV}`);
});