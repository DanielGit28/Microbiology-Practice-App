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
const MODEL = "claude-sonnet-5";
// groq/compound-mini es un sistema agéntico que por dentro invoca otros
// modelos (se ven llamadas separadas a openai/gpt-oss-120b y
// llama-3.3-70b-versatile en el dashboard de Groq por cada llamada
// nuestra), cada uno con su propio cupo — a veces por minuto, a veces por
// día — que no controlamos. Cuando cualquiera de esos cupos se agota,
// caemos de inmediato al modelo simple de un solo salto (openai/gpt-oss-20b,
// 8K TPM propios) en la misma petición, en vez de fallarle al usuario.
const GROQ_MODEL_PRIMARIO = "groq/compound-mini";
const GROQ_MODEL_RESPALDO = "openai/gpt-oss-20b";

// ---------- Casos de referencia (estático, para calibrar prompts) ----------
// Casos clínicos reales/aproximados de exámenes anteriores, usados por el
// cliente como referencia de estilo y nivel al generar casos nuevos (ver
// client/src/api/api.js). Se cachea en memoria porque el archivo no cambia
// mientras el servidor corre.
const CASOS_PRUEBA_PATH = path.join(__dirname, "casos-prueba.txt");
let casosPruebaCache = null;
app.get("/api/casos-prueba", (req, res) => {
  try {
    if (casosPruebaCache === null) {
      casosPruebaCache = fs.existsSync(CASOS_PRUEBA_PATH) ? fs.readFileSync(CASOS_PRUEBA_PATH, "utf8") : "";
    }
    res.json({ text: casosPruebaCache });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error leyendo los casos de referencia." });
  }
});

// ---------- API de Claude (proxy) ----------
app.post("/api/generate", async (req, res) => {
  const { system, user, maxTokens } = req.body || {};

  if (!user) {
    return res.status(400).json({ error: 'Falta el campo "user" en el body.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(500)
      .json({ error: "Falta ANTHROPIC_API_KEY en el servidor. Revisa server/.env (copia .env.example)." });
  }

  // El cliente pide distintos topes según el tipo de llamada (ver
  // client/src/api/api.js) — un caso clínico con 3 preguntas necesita bastante
  // más que una explicación corta. 1200 fijo cortaba a mitad el JSON de los
  // casos más largos (p. ej. Oral, que pide hasta 1700).
  const tope = Number.isFinite(maxTokens) ? Math.min(Math.max(maxTokens, 256), 4096) : 1200;

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
        max_tokens: tope,
        // Sonnet 5 piensa ("thinking" adaptativo) por defecto aunque no se pida,
        // y ese razonamiento consume del mismo max_tokens que la respuesta —
        // en generación de JSON simple eso puede agotar el presupuesto antes de
        // escribir el JSON (respuesta vacía) y siempre encarece la llamada sin
        // necesidad, ya que esta app solo pide generar/evaluar JSON, no razonar
        // problemas complejos.
        thinking: { type: "disabled" },
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

// A veces el mensaje de Groq trae el tiempo de espera en el texto en vez de
// (o además de) un header, p. ej. "Please try again in 9.6s" (límite por
// minuto) o "Please try again in 57m4.03s" (límite por día — los minutos
// son opcionales en el mensaje, hay que contemplarlos o se subestima la
// espera real por mucho).
function segundosDeEspera(mensaje) {
  const m = /in (?:(\d+)m)?(\d+(?:\.\d+)?)s/.exec(mensaje || "");
  if (!m) return null;
  const minutos = m[1] ? parseInt(m[1], 10) : 0;
  return minutos * 60 + parseFloat(m[2]);
}

// Una sola llamada a la API de Groq con un modelo específico. Lanza un
// Error con .status (el código HTTP de Groq) y .retryAfterSeconds cuando
// la respuesta no es exitosa, para que el llamador decida si vale la pena
// reintentar con otro modelo o esperar.
async function llamarGroq(model, system, user, maxTokens) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.GROQ_API_KEY
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  const data = await r.json();

  if (!r.ok) {
    const mensaje = data?.error?.message || "Error de la API de Groq.";
    const retryAfterHeader = r.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : segundosDeEspera(mensaje);
    const err = new Error(mensaje);
    err.status = r.status;
    err.retryAfterSeconds = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null;
    throw err;
  }

  return data.choices?.[0]?.message?.content || "";
}

// ---------- API de Groq (proxy) ----------
// Misma forma que /api/generate (Claude): body { system, user } -> { text }.
// Se elige entre los dos del lado del cliente con PROVIDER en client/src/api/api.js,
// sin tocar la lógica de Claude de arriba.
//
// Se intenta primero GROQ_MODEL_PRIMARIO. Si responde 429 (cupo agotado,
// por minuto o por día — compound-mini reparte trabajo entre varios
// modelos internos con cupos separados que no controlamos), se reintenta
// de inmediato con GROQ_MODEL_RESPALDO, que tiene su propio cupo
// independiente. Si el respaldo también se topa con un 429 pero la espera
// indicada es corta, se reintenta una vez más aquí mismo; si es larga, se
// devuelve el error con retryAfterSeconds para que el cliente decida
// (nunca tiene sentido que una función de servidor se quede esperando
// minutos).
app.post("/api/generate-groq", async (req, res) => {
  const { system, user, maxTokens } = req.body || {};

  if (!user) {
    return res.status(400).json({ error: 'Falta el campo "user" en el body.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res
      .status(500)
      .json({ error: "Falta GROQ_API_KEY en el servidor. Revisa server/.env (copia .env.example)." });
  }

  // max_tokens reserva cupo de una vez, así que cada tipo de llamada pide
  // solo lo que realmente necesita (el cliente lo indica en maxTokens);
  // 2048 es el techo por defecto si no se especifica.
  const tope = Number.isFinite(maxTokens) ? Math.min(Math.max(maxTokens, 256), 4096) : 2048;
  const ESPERA_MAXIMA_SEGUNDOS = 8;

  try {
    const text = await llamarGroq(GROQ_MODEL_PRIMARIO, system, user, tope);
    return res.json({ text });
  } catch (errPrimario) {
    if (errPrimario.status !== 429) {
      return res.status(errPrimario.status || 500).json({ error: errPrimario.message });
    }
    // 429 en el primario: se cae al modelo de respaldo más abajo.
    console.warn("[groq] " + GROQ_MODEL_PRIMARIO + " dio 429, cayendo a " + GROQ_MODEL_RESPALDO + ":", errPrimario.message);
  }

  try {
    const text = await llamarGroq(GROQ_MODEL_RESPALDO, system, user, tope);
    return res.json({ text });
  } catch (errRespaldo) {
    if (errRespaldo.status === 429 && (errRespaldo.retryAfterSeconds ?? Infinity) <= ESPERA_MAXIMA_SEGUNDOS) {
      await new Promise((resolve) => setTimeout(resolve, errRespaldo.retryAfterSeconds * 1000 + 500));
      try {
        const text = await llamarGroq(GROQ_MODEL_RESPALDO, system, user, tope);
        return res.json({ text });
      } catch (errFinal) {
        return res
          .status(errFinal.status || 500)
          .json({ error: errFinal.message, retryAfterSeconds: errFinal.retryAfterSeconds ?? null });
      }
    }
    return res
      .status(errRespaldo.status || 500)
      .json({ error: errRespaldo.message, retryAfterSeconds: errRespaldo.retryAfterSeconds ?? null });
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
// Body: { perfilId, areaId, correcto, modo?, dificultad?, preguntaId?, seleccion? }
// preguntaId + seleccion son opcionales (compatibilidad con datos viejos),
// pero sin ellos esa respuesta no puede aparecer en el historial: se
// necesita saber CUÁL pregunta se contestó y CON QUÉ opción, no solo si
// fue correcta, para poder mostrarla de nuevo después.
app.post("/api/respuestas", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const { perfilId, areaId, correcto, modo, dificultad, preguntaId, seleccion } = req.body || {};
  if (!perfilId || !areaId || typeof correcto !== "boolean") {
    return res.status(400).json({ error: "Faltan perfilId, areaId (string) o correcto (boolean) en el body." });
  }
  try {
    await pool.query(
      `INSERT INTO respuestas (perfil_id, area_id, correcto, modo, dificultad, pregunta_id, seleccion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        perfilId,
        areaId,
        correcto,
        modo || null,
        dificultad || null,
        preguntaId || null,
        typeof seleccion === "number" ? seleccion : null
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error guardando la respuesta." });
  }
});

// GET: historial de preguntas ya respondidas por un perfil, más recientes
// primero. Las que pertenecen a un caso clínico (Práctica) vienen agrupadas
// bajo su caso (tipo "caso"); las sueltas (Simulacro) vienen individuales
// (tipo "pregunta"). Solo incluye respuestas con "seleccion" registrada —
// las preguntas de un simulacro dejadas en blanco al finalizar no cuentan
// como "respondidas" para efectos del historial, aunque sí sumen como
// incorrectas en el dial de progreso. Los casos orales (tipo "caso-oral")
// no pasan por "respuestas" en absoluto — no hay nada que calificar, solo
// se listan los que se generaron, para poder repasar qué preguntas salieron.
app.get("/api/historial", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const perfilId = Number(req.query.perfilId);
  if (!perfilId) {
    return res.status(400).json({ error: "Falta perfilId en la consulta." });
  }
  try {
    const [sueltasRes, casosRes, oralesRes] = await Promise.all([
      pool.query(
        `SELECT r.id AS respuesta_id, r.creado_en, r.correcto, r.seleccion,
                p.id, p.area_id, p.pregunta, p.opciones, p.respuesta_correcta, p.explicacion, p.pista, p.dificultad
         FROM respuestas r
         JOIN preguntas p ON p.id = r.pregunta_id
         WHERE r.perfil_id = $1 AND r.seleccion IS NOT NULL AND p.caso_id IS NULL
         ORDER BY r.creado_en DESC
         LIMIT 300`,
        [perfilId]
      ),
      pool.query(
        `SELECT r.id AS respuesta_id, r.creado_en, r.correcto, r.seleccion,
                p.id AS pregunta_id, p.pregunta, p.opciones, p.respuesta_correcta, p.explicacion, p.pista, p.dificultad,
                c.id AS caso_id, c.area_id, c.modo, c.caso, c.dificultad AS caso_dificultad
         FROM respuestas r
         JOIN preguntas p ON p.id = r.pregunta_id
         JOIN casos c ON c.id = p.caso_id
         WHERE r.perfil_id = $1 AND r.seleccion IS NOT NULL
         ORDER BY r.creado_en DESC
         LIMIT 900`,
        [perfilId]
      ),
      pool.query(
        `SELECT c.id AS caso_id, c.area_id, c.modo, c.caso, c.dificultad AS caso_dificultad, c.creado_en,
                p.id AS pregunta_id, p.pregunta, p.puntos_clave
         FROM casos c
         JOIN preguntas p ON p.caso_id = c.id
         WHERE c.origen_perfil_id = $1 AND c.modo = 'oral'
         ORDER BY c.creado_en DESC
         LIMIT 900`,
        [perfilId]
      )
    ]);

    const sueltas = sueltasRes.rows.map((r) => ({ tipo: "pregunta", ...r, actividad_en: r.creado_en }));

    const gruposPorCaso = new Map();
    casosRes.rows.forEach((r) => {
      let grupo = gruposPorCaso.get(r.caso_id);
      if (!grupo) {
        grupo = {
          tipo: "caso",
          id: r.caso_id,
          area_id: r.area_id,
          modo: r.modo,
          caso: r.caso,
          dificultad: r.caso_dificultad,
          actividad_en: r.creado_en,
          preguntas: []
        };
        gruposPorCaso.set(r.caso_id, grupo);
      }
      grupo.preguntas.push({
        id: r.pregunta_id,
        pregunta: r.pregunta,
        opciones: r.opciones,
        respuesta_correcta: r.respuesta_correcta,
        explicacion: r.explicacion,
        pista: r.pista,
        dificultad: r.dificultad,
        seleccion: r.seleccion,
        correcto: r.correcto,
        respondida_en: r.creado_en
      });
      if (r.creado_en > grupo.actividad_en) grupo.actividad_en = r.creado_en;
    });

    const gruposOrales = new Map();
    oralesRes.rows.forEach((r) => {
      let grupo = gruposOrales.get(r.caso_id);
      if (!grupo) {
        grupo = {
          tipo: "caso-oral",
          id: r.caso_id,
          area_id: r.area_id,
          modo: r.modo,
          caso: r.caso,
          dificultad: r.caso_dificultad,
          actividad_en: r.creado_en,
          preguntas: []
        };
        gruposOrales.set(r.caso_id, grupo);
      }
      grupo.preguntas.push({ id: r.pregunta_id, pregunta: r.pregunta, puntos_clave: r.puntos_clave });
    });

    const historial = [...sueltas, ...gruposPorCaso.values(), ...gruposOrales.values()].sort(
      (a, b) => new Date(b.actividad_en) - new Date(a.actividad_en)
    );
    res.json(historial);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error consultando el historial." });
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

// Guarda un caso clínico completo (modo Práctica, Simulacro u Oral): el
// texto del caso y sus EXACTAMENTE 3 preguntas asociadas, en una sola
// transacción. Así el caso completo (no cada pregunta suelta) es la unidad
// que se favoritea.
// Body: { areaId, modo, caso, dificultad?, perfilId?, preguntas: [...] }
// En modo "oral" cada pregunta trae { pregunta, puntosClave } — son
// preguntas abiertas evaluadas por IA al momento, sin opciones ni
// respuesta correcta que guardar, y sin registrar respuestas después (a
// diferencia de Práctica/Simulacro). Se guardan solo para poder repasar
// después qué preguntas salieron. En cualquier otro modo, cada pregunta
// trae { pregunta, opciones, respuestaCorrecta, explicacion?, pista?,
// dificultad? } como antes.
app.post("/api/casos", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const { areaId, modo, caso, dificultad, perfilId, preguntas } = req.body || {};

  if (!areaId || !modo || !caso || !Array.isArray(preguntas) || preguntas.length === 0) {
    return res
      .status(400)
      .json({ error: "Faltan areaId, modo, caso o preguntas (array no vacío) en el body." });
  }

  const esOral = modo === "oral";
  for (const q of preguntas) {
    if (!q || !q.pregunta) {
      return res.status(400).json({ error: "Cada elemento de preguntas necesita 'pregunta'." });
    }
    if (esOral) {
      if (!Array.isArray(q.puntosClave)) {
        return res.status(400).json({ error: "Cada pregunta oral necesita 'puntosClave' (array)." });
      }
    } else {
      if (!Array.isArray(q.opciones) || q.opciones.length !== 4) {
        return res.status(400).json({ error: "Cada pregunta necesita 'opciones' (array de 4)." });
      }
      if (typeof q.respuestaCorrecta !== "number" || q.respuestaCorrecta < 0 || q.respuestaCorrecta > 3) {
        return res.status(400).json({ error: "respuestaCorrecta debe ser un número entre 0 y 3 en cada pregunta." });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const casoRes = await client.query(
      `INSERT INTO casos (area_id, modo, caso, dificultad, origen_perfil_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [areaId, modo, caso, dificultad || null, perfilId || null]
    );
    const casoId = casoRes.rows[0].id;

    const preguntaIds = [];
    for (const q of preguntas) {
      const r = await client.query(
        `INSERT INTO preguntas
           (area_id, modo, pregunta, opciones, respuesta_correcta, explicacion, pista, dificultad, origen_perfil_id, caso_id, puntos_clave)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          areaId,
          modo,
          q.pregunta,
          esOral ? null : JSON.stringify(q.opciones),
          esOral ? null : q.respuestaCorrecta,
          q.explicacion || null,
          q.pista || null,
          q.dificultad || null,
          perfilId || null,
          casoId,
          esOral ? JSON.stringify(q.puntosClave) : null
        ]
      );
      preguntaIds.push(r.rows[0].id);
    }

    await client.query("COMMIT");
    res.json({ id: casoId, preguntaIds });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message || "Error guardando el caso clínico." });
  } finally {
    client.release();
  }
});

// GET: lista los favoritos de un perfil, con su contenido completo. Puede
// haber dos tipos mezclados: "pregunta" (favoritos sueltos, típicamente del
// Simulacro) y "caso" (un caso clínico completo con sus 3 preguntas
// embebidas en "preguntas", típicamente de Práctica). Se combinan y ordenan
// por fecha en JS porque agregar (json_agg) para el segundo tipo no
// mezcla limpio con filas planas del primero en un solo UNION.
app.get("/api/favoritos", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const perfilId = Number(req.query.perfilId);
  if (!perfilId) {
    return res.status(400).json({ error: "Falta perfilId en la consulta." });
  }
  try {
    const [preguntasRes, casosRes] = await Promise.all([
      pool.query(
        `SELECT f.id AS favorito_id, p.id, p.area_id, p.modo, p.pregunta, p.opciones,
                p.respuesta_correcta, p.explicacion, p.pista, p.dificultad, f.creado_en
         FROM favoritos f
         JOIN preguntas p ON p.id = f.pregunta_id
         WHERE f.perfil_id = $1`,
        [perfilId]
      ),
      pool.query(
        `SELECT f.id AS favorito_id, c.id, c.area_id, c.modo, c.caso, c.dificultad, f.creado_en,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', p.id,
                      'pregunta', p.pregunta,
                      'opciones', p.opciones,
                      'respuesta_correcta', p.respuesta_correcta,
                      'explicacion', p.explicacion,
                      'pista', p.pista,
                      'dificultad', p.dificultad
                    ) ORDER BY p.id
                  ) FILTER (WHERE p.id IS NOT NULL),
                  '[]'
                ) AS preguntas
         FROM favoritos f
         JOIN casos c ON c.id = f.caso_id
         LEFT JOIN preguntas p ON p.caso_id = c.id
         WHERE f.perfil_id = $1
         GROUP BY f.id, c.id, c.area_id, c.modo, c.caso, c.dificultad, f.creado_en`,
        [perfilId]
      )
    ]);

    const preguntas = preguntasRes.rows.map((r) => ({ tipo: "pregunta", ...r }));
    const casos = casosRes.rows.map((r) => ({ tipo: "caso", ...r }));
    const todos = [...preguntas, ...casos].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error consultando los favoritos." });
  }
});

// POST: marca una pregunta O un caso como favorito. Body: { perfilId,
// preguntaId } o { perfilId, casoId } — exactamente uno de los dos.
// Idempotente.
app.post("/api/favoritos", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Falta DATABASE_URL en el servidor. Revisa server/.env" });
  }
  const { perfilId, preguntaId, casoId } = req.body || {};
  if (!perfilId || (!preguntaId && !casoId)) {
    return res.status(400).json({ error: "Faltan perfilId y (preguntaId o casoId) en el body." });
  }
  if (preguntaId && casoId) {
    return res.status(400).json({ error: "Envía solo preguntaId o casoId, no ambos." });
  }
  try {
    const { rows } = await pool.query(
      preguntaId
        ? `INSERT INTO favoritos (perfil_id, pregunta_id) VALUES ($1, $2)
           ON CONFLICT (perfil_id, pregunta_id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id
           RETURNING id`
        : `INSERT INTO favoritos (perfil_id, caso_id) VALUES ($1, $2)
           ON CONFLICT (perfil_id, caso_id) WHERE caso_id IS NOT NULL DO UPDATE SET perfil_id = EXCLUDED.perfil_id
           RETURNING id`,
      [perfilId, preguntaId || casoId]
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