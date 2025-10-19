import pg from 'pg';
const { Pool } = pg;

const connectionString =
  'postgresql://admin_siglad:K2wAoSPwxXgPAOflv1oZ9XE3fOcHhdxD@dpg-d3q32hali9vc73c1bj6g-a.oregon-postgres.render.com/siglad_db_909c?sslmode=require';

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});