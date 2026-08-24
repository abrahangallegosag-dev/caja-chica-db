// Inicializa la base de datos ejecutando schema.sql
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false } : false,
});

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Base de datos inicializada correctamente.');
  await pool.end();
}

init().catch(err => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});
