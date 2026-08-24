// ============================================================
//  CAJA CHICA - Backend Express + PostgreSQL
//  Security Data
// ============================================================
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false } : false,
});

// ---------- Catálogos ----------
app.get('/api/catalogos', async (req, res) => {
  try {
    const proy = await pool.query(
      'SELECT codigo, nombre FROM codigos_proyecto WHERE activo ORDER BY codigo');
    const cc = await pool.query(
      'SELECT codigo, nombre FROM centros_costo WHERE activo ORDER BY codigo');
    res.json({ proyectos: proy.rows, centros_costo: cc.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/codigos-proyecto', async (req, res) => {
  const { codigo, nombre } = req.body;
  if (!codigo || !nombre) return res.status(400).json({ error: 'codigo y nombre requeridos' });
  try {
    await pool.query(
      `INSERT INTO codigos_proyecto (codigo, nombre) VALUES ($1,$2)
       ON CONFLICT (codigo) DO UPDATE SET nombre=$2, activo=TRUE`,
      [codigo.toUpperCase().trim(), nombre.trim()]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/centros-costo', async (req, res) => {
  const { codigo, nombre } = req.body;
  if (!codigo) return res.status(400).json({ error: 'codigo requerido' });
  try {
    await pool.query(
      `INSERT INTO centros_costo (codigo, nombre) VALUES ($1,$2)
       ON CONFLICT (codigo) DO UPDATE SET nombre=$2, activo=TRUE`,
      [codigo.toUpperCase().trim(), (nombre || '').trim()]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Reposición actual (abierta) ----------
async function getOrCreateAbierta() {
  let r = await pool.query(`SELECT * FROM reposiciones WHERE estado='abierta' ORDER BY id DESC LIMIT 1`);
  if (r.rows.length) return r.rows[0];
  r = await pool.query(
    `INSERT INTO reposiciones (responsable) VALUES ($1) RETURNING *`, ['Abrahan Gallegos']);
  return r.rows[0];
}

app.get('/api/reposicion-actual', async (req, res) => {
  try {
    const rep = await getOrCreateAbierta();
    const f = await pool.query(
      'SELECT * FROM facturas WHERE reposicion_id=$1 ORDER BY fecha ASC NULLS LAST, id ASC', [rep.id]);
    res.json({ reposicion: rep, facturas: f.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reposicion-actual', async (req, res) => {
  const { fondo, limite_comida } = req.body;
  try {
    const rep = await getOrCreateAbierta();
    await pool.query(
      `UPDATE reposiciones SET fondo=COALESCE($1,fondo), limite_comida=COALESCE($2,limite_comida) WHERE id=$3`,
      [fondo, limite_comida, rep.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Facturas ----------
app.post('/api/facturas', async (req, res) => {
  const nuevas = req.body.facturas || [];
  try {
    const rep = await getOrCreateAbierta();
    const ins = [];
    for (const f of nuevas) {
      const r = await pool.query(
        `INSERT INTO facturas
         (reposicion_id, fecha, emisor, ruc, numero, descripcion, cc, codigo_proyecto,
          sub0, sub15, descuento, iva, total, excedente)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [rep.id, f.fecha || null, f.emisor, f.ruc, f.numero, f.descripcion,
         f.cc || 'ISLA', f.codigo_proyecto || 'ADM000',
         f.sub0 || 0, f.sub15 || 0, f.descuento || 0, f.iva || 0, f.total || 0, f.excedente || 0]);
      ins.push(r.rows[0].id);
    }
    res.json({ ok: true, ids: ins });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/facturas/:id', async (req, res) => {
  const { id } = req.params;
  const f = req.body;
  try {
    await pool.query(
      `UPDATE facturas SET emisor=$1, descripcion=$2, cc=$3, codigo_proyecto=$4,
       total=$5, excedente=$6, sub0=$7, sub15=$8, iva=$9 WHERE id=$10`,
      [f.emisor, f.descripcion, f.cc, f.codigo_proyecto, f.total, f.excedente,
       f.sub0, f.sub15, f.iva, id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/facturas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM facturas WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Historial ----------
app.get('/api/historial', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT r.*, COUNT(f.id) AS n_facturas, COALESCE(SUM(f.total),0) AS total_gastado
       FROM reposiciones r LEFT JOIN facturas f ON f.reposicion_id=r.id
       GROUP BY r.id ORDER BY r.creado_en DESC`);
    res.json({ historial: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reposicion-actual/cerrar', async (req, res) => {
  try {
    const rep = await getOrCreateAbierta();
    await pool.query(
      `UPDATE reposiciones SET estado='cerrada', cerrado_en=NOW() WHERE id=$1`, [rep.id]);
    res.json({ ok: true, cerrada: rep.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Inicialización automática de la base de datos ----------
// Crea las tablas y los códigos iniciales al arrancar (si no existen).
// Así no se necesita el Shell de Render (que es de pago).
const fs = require('fs');
async function initDB() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Base de datos verificada/inicializada correctamente.');
  } catch (e) {
    console.error('Error inicializando la base de datos:', e.message);
  }
}

const PORT = process.env.PORT || 5000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Caja Chica en puerto ${PORT}`));
});
