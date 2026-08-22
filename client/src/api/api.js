import {
  mockSimulacroBatch,
  mockCasoPractica,
  mockExtendedExplanation,
  mockCasoOral,
  mockEvaluation
} from "../data/mockData.js";
import { AREAS } from "../data/areas.js";

// Cambia esto a false cuando ya tengas server/ corriendo con tu ANTHROPIC_API_KEY
// (o GROQ_API_KEY, según PROVIDER más abajo). Ver README.md en la raíz del proyecto.
export const MOCK_MODE = false;

// Solo importa cuando MOCK_MODE es false: qué API real usar para generar.
// "claude" -> Anthropic (server/.env: ANTHROPIC_API_KEY). "groq" -> Groq
// (server/.env: GROQ_API_KEY), útil para probar gratis/barato antes de
// pagar la API de Claude.
export const PROVIDER = "groq"; // "claude" | "groq"

const SYS_GENERADOR =
  "Eres un generador experto de preguntas para las Pruebas de Grado (examen escrito) de la carrera de " +
  "Microbiología y Química Clínica de una universidad costarricense (UCIMED). Escribes en español de Costa Rica, " +
  "con precisión técnica de nivel universitario avanzado. Responde ÚNICAMENTE con JSON válido: sin texto antes " +
  "ni después, sin backticks, sin comentarios.";

const SIN_SPOILER_CASO =
  "REGLA CRÍTICA sobre el texto del caso: el 'caso' debe presentar SOLO los hallazgos crudos que llevan a la " +
  "conclusión (antecedentes, síntomas, hallazgos de tinción, morfología colonial, pruebas fenotípicas básicas " +
  "como oxidasa/catalasa/hemólisis, valores de laboratorio, etc.), pero NUNCA debe nombrar el microorganismo " +
  "identificado, el diagnóstico definitivo, ni el resultado de pruebas confirmatorias/de identificación final " +
  "(Vitek, MALDI-TOF, PCR, cultivo con resultado de especie, serología con diagnóstico, etc.) si eso revela la " +
  "respuesta a alguna de las 3 preguntas. El caso debe detenerse justo antes de la conclusión: el estudiante " +
  "llega a esa conclusión respondiendo las preguntas, no leyéndola en el caso.";

const ESTILO_KEVIN =
  "Aplica un estilo exigente e integrativo, conocido entre los estudiantes como preguntas 'tipo Kevin': alterna " +
  "entre (a) casos clínicos breves que obligan a integrar hallazgos de 2 o más áreas del laboratorio para llegar " +
  "a una conclusión, y (b) preguntas con distractores casi idénticos a la respuesta correcta que exigen un " +
  "detalle preciso (mecanismo exacto, excepción, matiz fino). Estas preguntas pueden ir un poco más allá de lo " +
  "literal del temario si el razonamiento microbiológico o clínico sigue siendo correcto y defendible. No " +
  "inventes organismos ni datos falsos.";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// Si Groq (o nuestro propio servidor, después de agotar su reintento
// interno con el modelo de respaldo) pide esperar más que esto, no tiene
// sentido colgar la pestaña — se avisa con un error claro en vez de
// congelar la UI por minutos u horas.
const ESPERA_MAXIMA_CLIENTE_SEGUNDOS = 20;

// maxTokens solo aplica al proveedor Groq (ver /api/generate-groq): la
// cuenta gratuita tiene un límite bajo de tokens por minuto (TPM), así que
// cada tipo de llamada pide nada más lo que necesita en vez de un tope fijo
// alto. Si aun así se topa con el límite (429), se espera el tiempo que
// indica Groq y se reintenta un par de veces antes de rendirse, en vez de
// romperle el flujo al usuario por algo que se resuelve solo en segundos.
async function callBackend(system, user, maxTokens, intentosRestantes = 2) {
  const endpoint = PROVIDER === "groq" ? "/api/generate-groq" : "/api/generate";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user, maxTokens })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      const espera = body.retryAfterSeconds ?? segundosDeEspera(body.error) ?? 5;
      // El servidor ya intenta un modelo de respaldo antes de llegar aquí,
      // así que si de todos modos pide esperar mucho (p. ej. un cupo diario
      // agotado, minutos u horas), no tiene sentido colgar la pestaña
      // esperando — se avisa con un mensaje claro en vez de congelar la UI.
      if (espera > ESPERA_MAXIMA_CLIENTE_SEGUNDOS) {
        throw new Error(
          "Groq está saturado ahora mismo (hay que esperar " +
            Math.ceil(espera / 60) +
            " min). Intenta de nuevo en un rato."
        );
      }
      if (intentosRestantes > 0) {
        await wait(Math.ceil(espera * 1000) + 500);
        return callBackend(system, user, maxTokens, intentosRestantes - 1);
      }
    }
    throw new Error(body.error || "Error del servidor (" + res.status + ")");
  }
  const data = await res.json();
  return data.text;
}

// ---------- Preguntas y favoritos (persistencia en el servidor) ----------
// Toda pregunta generada (mock o real) se guarda para poder favoritearla
// después. Si falla (p. ej. sin DATABASE_URL local), no debe romper el
// flujo de la pregunta: se resuelve con null y el botón de favorito queda
// deshabilitado en la UI.
async function guardarPregunta(payload) {
  try {
    const res = await fetch("/api/preguntas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
}

// Guarda un caso clínico completo (caso + sus 3 preguntas) de una sola vez,
// para que el caso completo — no cada pregunta suelta — sea la unidad que
// se favoritea. Igual que guardarPregunta, no debe romper el flujo si falla.
async function guardarCaso(payload) {
  try {
    const res = await fetch("/api/casos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return { id: null, preguntaIds: [] };
    return res.json();
  } catch {
    return { id: null, preguntaIds: [] };
  }
}

export async function listarFavoritos(perfilId) {
  const res = await fetch("/api/favoritos?perfilId=" + perfilId);
  if (!res.ok) throw new Error("No se pudieron cargar los favoritos (" + res.status + ")");
  return res.json();
}

// Preguntas y casos que el perfil ya respondió (Práctica y Simulacro), más
// recientes primero. Ver GET /api/historial en server/index.js.
export async function listarHistorial(perfilId) {
  const res = await fetch("/api/historial?perfilId=" + perfilId);
  if (!res.ok) throw new Error("No se pudo cargar el historial (" + res.status + ")");
  return res.json();
}

export async function favoritoAgregar(perfilId, preguntaId) {
  const res = await fetch("/api/favoritos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfilId, preguntaId })
  });
  if (!res.ok) throw new Error("No se pudo guardar el favorito (" + res.status + ")");
  return res.json();
}

export async function favoritoCasoAgregar(perfilId, casoId) {
  const res = await fetch("/api/favoritos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfilId, casoId })
  });
  if (!res.ok) throw new Error("No se pudo guardar el favorito (" + res.status + ")");
  return res.json();
}

export async function favoritoQuitar(favoritoId) {
  const res = await fetch("/api/favoritos/" + favoritoId, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo quitar el favorito (" + res.status + ")");
  return res.json();
}

// Encuentra el primer objeto/array JSON balanceado dentro del texto, e
// ignora cualquier cosa antes o después (fences de markdown, texto
// introductorio, o basura al final que a veces agregan modelos como los de
// Groq — p. ej. una "}" extra después del cierre real). No basta con tomar
// el último "}" o "]" del texto: hay que contar profundidad del tipo de
// paréntesis correcto y no contar los que están dentro de strings.
function parseJSON(text) {
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const first = clean.search(/[[{]/);
  if (first === -1) return JSON.parse(clean);

  const openChar = clean[first];
  const closeChar = openChar === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = first; i < clean.length; i++) {
    const ch = clean[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  return JSON.parse(end !== -1 ? clean.slice(first, end + 1) : clean);
}

// Los casos clínicos (caso + 3 preguntas) generan respuestas largas, y a
// veces el modelo corta el JSON a mitad de una cadena (respuesta truncada) —
// más aún en áreas con casos verbosos (p. ej. Bioquímica con un panel de
// laboratorio largo). Si el parseo falla, se reintenta con el doble de
// tokens permitidos (reintentar con el mismo tope solo repetiría el mismo
// corte) antes de rendirse.
async function callBackendJSON(system, user, maxTokens) {
  const text = await callBackend(system, user, maxTokens);
  try {
    return parseJSON(text);
  } catch {
    const maxTokensReintento = maxTokens ? Math.min(maxTokens * 2, 4096) : 4096;
    const retryText = await callBackend(system, user, maxTokensReintento);
    return parseJSON(retryText);
  }
}

export async function generarLoteSimulacro(areasConConteo, perfilId) {
  const lote = await generarLoteSimulacroBase(areasConConteo);
  const conIds = await Promise.all(
    lote.map(async (p) => {
      const area = AREAS.find((a) => a.name === p.area);
      const id = await guardarPregunta({
        areaId: area ? area.id : p.area,
        modo: "simulacro",
        pregunta: p.pregunta,
        opciones: p.opciones,
        respuestaCorrecta: p.respuesta_correcta,
        explicacion: p.explicacion,
        pista: p.pista || null,
        dificultad: p.dificultad,
        perfilId
      });
      return { ...p, id };
    })
  );
  return conIds;
}

async function generarLoteSimulacroBase(areasConConteo) {
  if (MOCK_MODE) return mockSimulacroBatch(areasConConteo);

  const listado = areasConConteo
    .map(
      (ac) =>
        '- Área (usa este texto EXACTO en el campo "area"): "' +
        ac.area.name +
        '". Contexto de temas: ' +
        ac.area.temas +
        ". Genera " +
        ac.count +
        " pregunta(s) de esta área."
    )
    .join("\n");

  const user =
    "Genera preguntas de selección única (4 opciones, una sola correcta) para estas áreas:\n" +
    listado +
    "\n\n" +
    ESTILO_KEVIN +
    " Marca 'dificultad':'kevin' en las preguntas que sigan este estilo intensificado, o 'normal' en las " +
    "estándar bien fundamentadas. Procura que aproximadamente la mitad sean 'kevin'." +
    "\n\nDevuelve un array JSON con este formato exacto:\n" +
    '[{"area":"...","pregunta":"...","opciones":["...","...","...","..."],"respuesta_correcta":0,' +
    '"explicacion":"...","dificultad":"normal"}]\n' +
    '"respuesta_correcta" es el índice (0 a 3) de la opción correcta dentro de "opciones". "explicacion" debe ' +
    "tener 2-3 frases.";

  const r = await callBackendJSON(SYS_GENERADOR, user, 1800);
  return Array.isArray(r) ? r : [r];
}

// Modo Práctica: siempre en formato de caso clínico/laboratorial — un caso
// breve por área, con 3 preguntas de selección única asociadas al mismo
// caso. El caso completo (no cada pregunta suelta) se guarda como una sola
// unidad, para poder favoritearlo como tal.
export async function generarCasoPractica(area, kevin, perfilId, seedPregunta) {
  const caso = await generarCasoPracticaBase(area, kevin, seedPregunta);
  const dificultad = kevin ? "kevin" : "normal";
  const { id, preguntaIds } = await guardarCaso({
    areaId: area.id,
    modo: "practica",
    caso: caso.caso,
    dificultad,
    perfilId,
    preguntas: caso.preguntas.map((q) => ({
      pregunta: q.pregunta,
      opciones: q.opciones,
      respuestaCorrecta: q.respuesta_correcta,
      explicacion: q.explicacion,
      pista: q.pista || null,
      dificultad: q.dificultad
    }))
  });
  const preguntas = caso.preguntas.map((q, i) => ({ ...q, id: preguntaIds[i] || null }));
  return { id, caso: caso.caso, dificultad, preguntas };
}

async function generarCasoPracticaBase(area, kevin, seedPregunta) {
  if (MOCK_MODE) return mockCasoPractica(area, kevin);

  const referenciaSeed = seedPregunta
    ? "\n\nEsta pregunta de referencia es SOLO para calibrar estilo y nivel de dificultad — NO la repitas ni la " +
      "parafrasees, y NO construyas el caso alrededor de ella. Genera un caso y preguntas DIFERENTES, sobre otro " +
      "organismo, concepto o matiz del mismo tema:\n" +
      'Pregunta de referencia: "' +
      seedPregunta.pregunta +
      '"\nOpciones: ' +
      seedPregunta.opciones.join(" / ") +
      '\nRespuesta correcta de referencia: "' +
      seedPregunta.opciones[seedPregunta.respuesta_correcta] +
      '"'
    : "";

  const user =
    'Área: "' +
    area.name +
    '". Contexto de temas: ' +
    area.temas +
    ".\n\nGenera UN caso clínico o de laboratorio breve y realista (4-8 líneas) de esta área, con los datos " +
    "relevantes que apliquen (antecedentes, síntomas, hallazgos de tinción, cultivo, serología, hemograma, " +
    "imágenes, etc.), seguido de EXACTAMENTE 3 preguntas de selección única (4 opciones cada una, una sola " +
    "correcta) que solo puedan responderse integrando la información del caso. Cada pregunta debe evaluar un " +
    "aspecto distinto (por ejemplo: identificación del agente o diagnóstico, interpretación de un hallazgo o " +
    "mecanismo, y siguiente paso diagnóstico o terapéutico).\n\n" +
    SIN_SPOILER_CASO +
    (kevin
      ? " " + ESTILO_KEVIN + " Las 3 preguntas deben ser 'kevin'."
      : " Nivel estándar de examen de grado, bien fundamentado, con distractores plausibles pero justos " +
        "('dificultad':'normal') para las 3 preguntas.") +
    referenciaSeed +
    "\n\nDevuelve SOLO este JSON:\n" +
    '{"caso":"...","preguntas":[{"pregunta":"...","opciones":["...","...","...","..."],"respuesta_correcta":0,' +
    '"pista":"...","explicacion":"...","dificultad":"' +
    (kevin ? "kevin" : "normal") +
    '"}]}\n"preguntas" debe tener EXACTAMENTE 3 elementos. "pista" debe orientar sin revelar la respuesta ' +
    'directamente. "explicacion" debe tener 2-4 frases.';

  const r = await callBackendJSON(SYS_GENERADOR, user, 2200);
  return Array.isArray(r) ? r[0] : r;
}

export async function generarExplicacionExtendida(area, pregunta, caso) {
  if (MOCK_MODE) return mockExtendedExplanation(area, pregunta);

  const sys =
    "Eres un profesor experto en microbiología y química clínica, preparando a una estudiante para su examen " +
    "de grado (Costa Rica). Explicas conceptos con claridad, sin relleno, en español.";
  const contextoCaso = caso ? '\nCaso clínico asociado: "' + caso + '"' : "";
  const user =
    "Área: " +
    area.name +
    contextoCaso +
    '\nLa estudiante falló o pidió ayuda con esta pregunta: "' +
    pregunta.pregunta +
    '" (respuesta correcta: "' +
    pregunta.opciones[pregunta.respuesta_correcta] +
    '").\nEscribe una explicación conceptual de 120-180 palabras sobre el tema de fondo (no solo repitas la ' +
    "respuesta): por qué es correcta, y qué principio general hay que dominar para no volver a fallar preguntas " +
    "similares. Texto plano, sin JSON, sin markdown.";

  return callBackend(sys, user, 500);
}

// Modo Oral: siempre en formato de caso clínico/laboratorial de UN área
// (elegida por la estudiante, como en Práctica) — un caso breve, con 3
// preguntas abiertas asociadas al mismo caso, tal como lo pediría el
// tribunal ante un caso presentado.
// Se guarda el caso + sus 3 preguntas (sin respuestas: Oral se evalúa con
// IA al momento y no se registra la evaluación), solo para poder repasar
// después en el Historial qué preguntas salieron. Igual que en Práctica,
// si el guardado falla no debe romper el flujo — el caso sigue siendo
// usable, solo con id nulo (no aparecerá en el Historial).
export async function generarCasoOral(area, perfilId) {
  const caso = await generarCasoOralBase(area);
  const { id, preguntaIds } = await guardarCaso({
    areaId: area.id,
    modo: "oral",
    caso: caso.caso,
    perfilId,
    preguntas: caso.preguntas.map((q) => ({ pregunta: q.pregunta, puntosClave: q.puntos_clave }))
  });
  const preguntas = caso.preguntas.map((q, i) => ({ ...q, id: preguntaIds[i] || null }));
  return { id, caso: caso.caso, preguntas };
}

async function generarCasoOralBase(area) {
  if (MOCK_MODE) return mockCasoOral(area);

  const user =
    'Área: "' +
    area.name +
    '". Contexto de temas: ' +
    area.temas +
    ".\n\nGenera UN caso clínico o de laboratorio breve y realista (4-8 líneas) de esta área para la Prueba de " +
    "Grado ORAL, seguido de EXACTAMENTE 3 preguntas abiertas (sin opciones) que la estudiante debe responder en " +
    "voz alta ante el tribunal, integrando la información del caso. Deben exigir integración conceptual y " +
    "capacidad de argumentar, no solo memorizar un dato aislado.\n\n" +
    SIN_SPOILER_CASO +
    "\n\nDevuelve SOLO este JSON:\n" +
    '{"caso":"...","preguntas":[{"pregunta":"...","puntos_clave":["...","...","..."]}]}\n' +
    '"preguntas" debe tener EXACTAMENTE 3 elementos. "puntos_clave" son 3-5 elementos que una buena respuesta ' +
    "debería mencionar.";

  const r = await callBackendJSON(SYS_GENERADOR, user, 1700);
  return Array.isArray(r) ? r[0] : r;
}

export async function evaluarRespuestaOral(pregunta, respuestaEstudiante, caso) {
  if (MOCK_MODE) return mockEvaluation(pregunta, respuestaEstudiante);

  const sys =
    "Eres uno de los dos miembros del tribunal académico de la Prueba de Grado Oral de Microbiología y Química " +
    "Clínica (Costa Rica). Evalúas con los criterios oficiales: dominio del contenido, claridad y coherencia en " +
    "la exposición, capacidad de análisis y argumentación, uso adecuado del vocabulario técnico, y actitud " +
    "profesional. Eres exigente pero constructivo. Responde ÚNICAMENTE con JSON válido, sin backticks.";
  const contextoCaso = caso ? 'Caso clínico presentado: "' + caso + '"\n\n' : "";
  const user =
    contextoCaso +
    'Pregunta: "' +
    pregunta.pregunta +
    '"\nPuntos clave esperados: ' +
    pregunta.puntos_clave.join("; ") +
    '\n\nRespuesta de la estudiante (transcrita o escrita, tal cual la dio):\n"' +
    (respuestaEstudiante || "(sin respuesta)") +
    '"\n\nDevuelve SOLO este JSON:\n{"nota_estimada":"7/10","fortalezas":["...","..."],' +
    '"areas_mejora":["...","..."],"comentario_general":"..."}';

  return callBackendJSON(sys, user, 700);
}
