-- ============================================================
--  CAJA CHICA - Esquema de base de datos (PostgreSQL)
--  Security Data
-- ============================================================

-- Códigos de proyecto (ADM000, OP000, SO000...)
CREATE TABLE IF NOT EXISTS codigos_proyecto (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(20)  NOT NULL UNIQUE,
  nombre      VARCHAR(100) NOT NULL,
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Centros de costo (CC): ISLA, etc.
CREATE TABLE IF NOT EXISTS centros_costo (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(20)  NOT NULL UNIQUE,
  nombre      VARCHAR(100),
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Reposiciones (cada "corte" de caja chica = un reporte SD-FO-AF-03)
CREATE TABLE IF NOT EXISTS reposiciones (
  id            SERIAL PRIMARY KEY,
  responsable   VARCHAR(120) NOT NULL,
  fondo         NUMERIC(10,2) NOT NULL DEFAULT 250,
  limite_comida NUMERIC(10,2) NOT NULL DEFAULT 5,
  estado        VARCHAR(20)  NOT NULL DEFAULT 'abierta', -- abierta | cerrada
  creado_en     TIMESTAMP    NOT NULL DEFAULT NOW(),
  cerrado_en    TIMESTAMP
);

-- Facturas (comprobantes) de cada reposición
CREATE TABLE IF NOT EXISTS facturas (
  id             SERIAL PRIMARY KEY,
  reposicion_id  INTEGER REFERENCES reposiciones(id) ON DELETE CASCADE,
  fecha          DATE,
  emisor         VARCHAR(200),
  ruc            VARCHAR(20),
  numero         VARCHAR(30),
  descripcion    VARCHAR(40),           -- MERIENDA / ALMUERZO / AGUA...
  cc             VARCHAR(20)  DEFAULT 'ISLA',
  codigo_proyecto VARCHAR(20) DEFAULT 'ADM000',
  sub0           NUMERIC(10,2) DEFAULT 0,
  sub15          NUMERIC(10,2) DEFAULT 0,
  descuento      NUMERIC(10,2) DEFAULT 0,
  iva            NUMERIC(10,2) DEFAULT 0,
  total          NUMERIC(10,2) DEFAULT 0,
  excedente      NUMERIC(10,2) DEFAULT 0,
  creado_en      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_reposicion ON facturas(reposicion_id);

-- ============================================================
--  DATOS INICIALES (semilla)
--  >>> REEMPLAZA / AGREGA los códigos reales de Security Data <<<
-- ============================================================

INSERT INTO codigos_proyecto (codigo, nombre) VALUES
  ('ADM000', 'Administración'),
  ('OP000',  'Operaciones'),
  ('SO000',  'Soporte')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO centros_costo (codigo, nombre) VALUES
  ('ISLA', 'Isla'),
  ('OFICINA', 'Oficina')
ON CONFLICT (codigo) DO NOTHING;
