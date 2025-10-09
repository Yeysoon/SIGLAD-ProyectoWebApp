// backend/src/config/database.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Usamos la variable DATABASE_URL, que es el método preferido por Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production' // Solo requerido en producción (Render)
    }
});

pool.connect()
    .then(client => {
        console.log('✅ Conexión exitosa a PostgreSQL (Render)');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error de conexión a PostgreSQL:', err.stack);
        // Si falla la conexión a la DB, el proceso debe terminar
        process.exit(1); 
    });

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};