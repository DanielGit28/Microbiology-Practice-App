import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import "dotenv/config";
import { pool, initSchema } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;
const MODEL = "claude-sonnet-4-6";
const GROQ_MODEL = "openai/gpt-oss-20b";

// ---------- API de Claude (proxy) ----------
app.post("/api/generate", async (req, res) => {
  const { system, user } = req.body || {};

  if (!user) {
    return res.status(400).json({ error: 'Falta el campo "user" en el body.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(500)
      .json({ error: "Falta ANTHROPIC_API_KEY en el servidor. Revisa server/.env (copia .env.example)." });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: user }]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || "Error de la API de Anthropic." });
    }

    const text = (data.content || []).map((b) => b.text || "").join("\n");
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error inesperado en el servidor." });
  }
});

// ---------- API de Groq (proxy) ----------
// Misma forma que /api/generate (Claude): body { system, user } -> { text }.
// Se elige entre los dos del lado del cliente con PROVIDER en client/src/api/api.js,
// sin tocar la lógica de Claude de arriba.
app.post("/api/generate-groq", async (req, res) => {
  const { system, user } = req.body || {};

  if (!user) {
    return res.status(400).json({ error: 'Falta el campo "user" en el body.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res
      .status(500)
      .json({ error: "Falta GROQ_API_KEY en el servidor. Revisa server/.env (copia .env.example)." });
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.8,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || "Error de la API de Groq." });
    }

    const text = data.choices?.[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error inesperado en el servidor." });
  }
});

// ---------- Perfiles (Postgres / Neon) ----------
// Sin autenticación: cualquiera puede crear un perfil o continuar uno existente.
// GET: lista todos los perfiles, más reciente actividad primero.
app.get("/api/perfiles", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.nombre, p.creado_en, MAX(r.creado_en) AS ultima_actividad
      FROM perfiles p
      LEFT JOIN respuestas r ON r.perfil_id = p.id
      GROUP BY p.id, p.nombre, p.creado_en
      ORDER BY COALESCE(MAX(r.creado_en), p.creado_en) DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error consultando los perfiles." });
  }
});

// POST: crea un perfil nuevo. Body: { nombre }
app.post("/api/perfiles", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const nombre = (req.body?.nombre || "").trim();
  if (!nombre) {
    return res.status(400).json({ error: "Falta el nombre del perfil." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO perfiles (nombre) VALUES ($1) RETURNING id, nombre, creado_en`,
      [nombre]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error creando el perfil." });
  }
});

// ---------- Progreso (Postgres / Neon) ----------
// GET: progreso acumulado por área para un perfil, calculado agregando la tabla respuestas.
app.get("/api/progreso", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const perfilId = Number(req.query.perfilId);
  if (!perfilId) {
    return res.status(400).json({ error: "Falta perfilId en la consulta." });
  }
  try {
    const { rows } = await pool.query(
      `SELECT area_id,
              COUNT(*)::int AS total,
              SUM(CASE WHEN correcto THEN 1 ELSE 0 END)::int AS correctas
       FROM respuestas
       WHERE perfil_id = $1
       GROUP BY area_id`,
      [perfilId]
    );
    const progreso = {};
    rows.forEach((r) => {
      progreso[r.area_id] = { correctas: r.correctas, total: r.total };
    });
    res.json(progreso);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error consultando el progreso." });
  }
});

// POST: registra una respuesta individual (práctica o simulacro) para un perfil.
// Body: { perfilId, areaId, correcto, modo?, dificultad? }
app.post("/api/respuestas", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const { perfilId, areaId, correcto, modo, dificultad } = req.body || {};
  if (!perfilId || !areaId || typeof correcto !== "boolean") {
    return res.status(400).json({ error: "Faltan perfilId, areaId (string) o correcto (boolean) en el body." });
  }
  try {
    await pool.query(
      `INSERT INTO respuestas (perfil_id, area_id, correcto, modo, dificultad) VALUES ($1, $2, $3, $4, $5)`,
      [perfilId, areaId, correcto, modo || null, dificultad || null]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error guardando la respuesta." });
  }
});

// ---------- Preguntas y Favoritos (Postgres / Neon) ----------
// Toda pregunta generada (mock o real) se guarda para poder favoritearla
// después. POST: body { areaId, modo, pregunta, opciones, respuestaCorrecta,
// explicacion?, pista?, dificultad?, perfilId?, seedPreguntaId? }
app.post("/api/preguntas", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const {
    areaId,
    modo,
    pregunta,
    opciones,
    respuestaCorrecta,
    explicacion,
    pista,
    dificultad,
    perfilId,
    seedPreguntaId
  } = req.body || {};

  if (!areaId || !modo || !pregunta || !Array.isArray(opciones) || opciones.length !== 4) {
    return res
      .status(400)
      .json({ error: "Faltan areaId, modo, pregunta o opciones (array de 4) en el body." });
  }
  if (typeof respuestaCorrecta !== "number" || respuestaCorrecta < 0 || respuestaCorrecta > 3) {
    return res.status(400).json({ error: "respuestaCorrecta debe ser un número entre 0 y 3." });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO preguntas
         (area_id, modo, pregunta, opciones, respuesta_correcta, explicacion, pista, dificultad, origen_perfil_id, seed_pregunta_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        areaId,
        modo,
        pregunta,
        JSON.stringify(opciones),
        respuestaCorrecta,
        explicacion || null,
        pista || null,
        dificultad || null,
        perfilId || null,
        seedPreguntaId || null
      ]
    );
    res.json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error guardando la pregunta." });
  }
});

// GET: lista las preguntas favoritas de un perfil, con su contenido completo.
app.get("/api/favoritos", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const perfilId = Number(req.query.perfilId);
  if (!perfilId) {
    return res.status(400).json({ error: "Falta perfilId en la consulta." });
  }
  try {
    const { rows } = await pool.query(
      `SELECT f.id AS favorito_id, p.id, p.area_id, p.modo, p.pregunta, p.opciones,
              p.respuesta_correcta, p.explicacion, p.pista, p.dificultad, f.creado_en
       FROM favoritos f
       JOIN preguntas p ON p.id = f.pregunta_id
       WHERE f.perfil_id = $1
       ORDER BY f.creado_en DESC`,
      [perfilId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error consultando los favoritos." });
  }
});

// POST: marca una pregunta como favorita. Body: { perfilId, preguntaId }. Idempotente.
app.post("/api/favoritos", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const { perfilId, preguntaId } = req.body || {};
  if (!perfilId || !preguntaId) {
    return res.status(400).json({ error: "Faltan perfilId o preguntaId en el body." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO favoritos (perfil_id, pregunta_id) VALUES ($1, $2)
       ON CONFLICT (perfil_id, pregunta_id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id
       RETURNING id`,
      [perfilId, preguntaId]
    );
    res.json({ ok: true, id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error guardando el favorito." });
  }
});

// DELETE: quita una pregunta de favoritos por el id de la fila en favoritos.
app.delete("/api/favoritos/:id", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Id de favorito inválido." });
  }
  try {
    await pool.query(`DELETE FROM favoritos WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error quitando el favorito." });
  }
});

// ---------- Sirve la app compilada (opcional, útil para desplegar un solo servicio) ----------
// Si ya corriste "npm run build" en client/, este mismo servidor sirve la UI
// en la misma URL que la API — así el celular y la laptop solo necesitan
// abrir una URL, sin preocuparse por CORS ni por otra URL de API.
const clientDist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// En Vercel esto corre como función serverless (ver api/index.js en la raíz
// del repo): no hay proceso persistente que escuchar, Vercel invoca la app
// de Express directamente por request. process.env.VERCEL lo pone Vercel
// automáticamente en build y en runtime.
if (process.env.VERCEL) {
  initSchema().catch((err) => console.error("No se pudo inicializar el esquema de la base de datos:", err.message));
} else {
  initSchema()
    .catch((err) => console.error("No se pudo inicializar el esquema de la base de datos:", err.message))
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Servidor de Incubadora escuchando en http://localhost:${PORT}`);
        if (!fs.existsSync(clientDist)) {
          console.log("(client/dist no existe todavía — corre 'npm run build' en client/ si quieres servir la UI desde aquí)");
        }
      });
    });
}

export default app;