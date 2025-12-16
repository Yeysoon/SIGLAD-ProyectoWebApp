import pg from 'pg';
const { Pool } = pg;

const connectionString =
  'postgresql://admin_siglad:1BmLmG7No3HmH0kUSbwgy0w58X2GyMTj@dpg-d50b5pfgi27c73agpcr0-a.oregon-postgres.render.com/siglad_db_gj5e';

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});