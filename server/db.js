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

  // Un caso clínico/laboratorial generado en modo Práctica u Oral (ver
  // Contenidos del temario). Sus 3 preguntas asociadas viven en la tabla
  // "preguntas" enlazadas por caso_id. Las preguntas del Simulacro no tienen
  // caso (caso_id queda NULL): son preguntas sueltas, como siempre.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS casos (
      id SERIAL PRIMARY KEY,
      area_id TEXT NOT NULL,
      modo TEXT NOT NULL,
      caso TEXT NOT NULL,
      dificultad TEXT,
      origen_perfil_id INTEGER REFERENCES perfiles(id) ON DELETE SET NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
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

  // Por si la tabla preguntas ya existía de antes de que existiera "casos".
  await pool.query(`
    ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_preguntas_caso ON preguntas (caso_id)
  `);

  // Un favorito apunta a UNA pregunta suelta (modo simulacro) O a UN caso
  // completo (modo práctica/oral, que arrastra sus 3 preguntas) — nunca
  // ambos. Se valida en el endpoint, no con un CHECK, para mantener el
  // mismo estilo laxo del resto de este esquema.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS favoritos (
      id SERIAL PRIMARY KEY,
      perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
      pregunta_id INTEGER REFERENCES preguntas(id) ON DELETE CASCADE,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (perfil_id, pregunta_id)
    )
  `);

  // Por si la tabla favoritos ya existía de antes con pregunta_id NOT NULL.
  await pool.query(`
    ALTER TABLE favoritos ALTER COLUMN pregunta_id DROP NOT NULL
  `);

  await pool.query(`
    ALTER TABLE favoritos ADD COLUMN IF NOT EXISTS caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_favoritos_perfil_caso
    ON favoritos (perfil_id, caso_id) WHERE caso_id IS NOT NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_favoritos_perfil ON favoritos (perfil_id)
  `);
}
