import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function initSchema() {
  if (!process.env.DATABASE_URL) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS perfiles (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS respuestas (
      id SERIAL PRIMARY KEY,
      perfil_id INTEGER REFERENCES perfiles(id) ON DELETE CASCADE,
      area_id TEXT NOT NULL,
      correcto BOOLEAN NOT NULL,
      modo TEXT,
      dificultad TEXT,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Por si la tabla respuestas ya existía de antes sin perfil_id.
  await pool.query(`
    ALTER TABLE respuestas ADD COLUMN IF NOT EXISTS perfil_id INTEGER REFERENCES perfiles(id) ON DELETE CASCADE
  `);

  // Toda pregunta generada (mock o real) se guarda aquí, para poder
  // favoritearla después y usarla como semilla de nuevas preguntas.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS preguntas (
      id SERIAL PRIMARY KEY,
      area_id TEXT NOT NULL,
      modo TEXT NOT NULL,
      pregunta TEXT NOT NULL,
      opciones JSONB NOT NULL,
      respuesta_correcta INTEGER NOT NULL,
      explicacion TEXT,
      pista TEXT,
      dificultad TEXT,
      origen_perfil_id INTEGER REFERENCES perfiles(id) ON DELETE SET NULL,
      seed_pregunta_id INTEGER REFERENCES preguntas(id) ON DELETE SET NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favoritos (
      id SERIAL PRIMARY KEY,
      perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
      pregunta_id INTEGER NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (perfil_id, pregunta_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_favoritos_perfil ON favoritos (perfil_id)
  `);
}
