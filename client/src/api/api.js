import {
  mockSimulacroBatch,
  mockPracticaQuestion,
  mockExtendedExplanation,
  mockOralQuestions,
  mockEvaluation
} from "../data/mockData.js";
import { AREAS } from "../data/areas.js";

// Cambia esto a false cuando ya tengas server/ corriendo con tu ANTHROPIC_API_KEY.
// Ver README.md en la raíz del proyecto.
export const MOCK_MODE = true;

const SYS_GENERADOR =
  "Eres un generador experto de preguntas para las Pruebas de Grado (examen escrito) de la carrera de " +
  "Microbiología y Química Clínica de una universidad costarricense (UCIMED). Escribes en español de Costa Rica, " +
  "con precisión técnica de nivel universitario avanzado. Responde ÚNICAMENTE con JSON válido: sin texto antes " +
  "ni después, sin backticks, sin comentarios.";

const ESTILO_KEVIN =
  "Aplica un estilo exigente e integrativo, conocido entre los estudiantes como preguntas 'tipo Kevin': alterna " +
  "entre (a) casos clínicos breves que obligan a integrar hallazgos de 2 o más áreas del laboratorio para llegar " +
  "a una conclusión, y (b) preguntas con distractores casi idénticos a la respuesta correcta que exigen un " +
  "detalle preciso (mecanismo exacto, excepción, matiz fino). Estas preguntas pueden ir un poco más allá de lo " +
  "literal del temario si el razonamiento microbiológico o clínico sigue siendo correcto y defendible. No " +
  "inventes organismos ni datos falsos.";

async function callBackend(system, user) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error del servidor (" + res.status + ")");
  }
  const data = await res.json();
  return data.text;
}

function parseJSON(text) {
  let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const first = Math.min(
    ...["[", "{"].map((c) => {
      const i = clean.indexOf(c);
      return i === -1 ? Infinity : i;
    })
  );
  const last = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  if (first !== Infinity && last !== -1 && last > first) {
    clean = clean.substring(first, last + 1);
  }
  return JSON.parse(clean);
}

export async function generarLoteSimulacro(areasConConteo) {
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

  const text = await callBackend(SYS_GENERADOR, user);
  const r = parseJSON(text);
  return Array.isArray(r) ? r : [r];
}

export async function generarPreguntaPractica(area, kevin) {
  if (MOCK_MODE) return mockPracticaQuestion(area, kevin);

  const user =
    'Área: "' +
    area.name +
    '". Contexto de temas: ' +
    area.temas +
    ". Genera UNA pregunta de selección única (4 opciones, una sola correcta) de esta área." +
    (kevin
      ? " " + ESTILO_KEVIN + " Esta pregunta debe ser 'kevin'."
      : " Nivel estándar de examen de grado, bien fundamentada, con distractores plausibles pero justos " +
        "('dificultad':'normal').") +
    "\n\nDevuelve SOLO este JSON:\n" +
    '{"pregunta":"...","opciones":["...","...","...","..."],"respuesta_correcta":0,"pista":"...",' +
    '"explicacion":"...","dificultad":"' +
    (kevin ? "kevin" : "normal") +
    '"}\n"pista" debe orientar sin revelar la respuesta directamente. "explicacion" debe tener 2-4 frases.';

  const text = await callBackend(SYS_GENERADOR, user);
  const r = parseJSON(text);
  return Array.isArray(r) ? r[0] : r;
}

export async function generarExplicacionExtendida(area, pregunta) {
  if (MOCK_MODE) return mockExtendedExplanation(area);

  const sys =
    "Eres un profesor experto en microbiología y química clínica, preparando a una estudiante para su examen " +
    "de grado (Costa Rica). Explicas conceptos con claridad, sin relleno, en español.";
  const user =
    "Área: " +
    area.name +
    '. La estudiante falló o pidió ayuda con esta pregunta: "' +
    pregunta.pregunta +
    '" (respuesta correcta: "' +
    pregunta.opciones[pregunta.respuesta_correcta] +
    '").\nEscribe una explicación conceptual de 120-180 palabras sobre el tema de fondo (no solo repitas la ' +
    "respuesta): por qué es correcta, y qué principio general hay que dominar para no volver a fallar preguntas " +
    "similares. Texto plano, sin JSON, sin markdown.";

  return callBackend(sys, user);
}

export async function generarPreguntasOrales() {
  if (MOCK_MODE) return mockOralQuestions();

  // Muestra 3 áreas al azar del lado del cliente y le pide al modelo una pregunta por cada una.
  const copia = [...AREAS];
  const muestra = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * copia.length);
    muestra.push(copia.splice(idx, 1)[0]);
  }
  const listado = muestra.map((a) => '- "' + a.name + '" (temas: ' + a.temas + ")").join("\n");
  const user =
    "Genera 3 preguntas de examen ORAL (abiertas, sin opciones) para las Pruebas de Grado, una por cada área:\n" +
    listado +
    "\nDeben exigir integración conceptual y capacidad de argumentar en voz alta, no solo memorizar un dato." +
    "\n\nDevuelve SOLO un array JSON:\n" +
    '[{"area":"...","pregunta":"...","puntos_clave":["...","...","..."]}]\n' +
    '"puntos_clave" son 3-5 elementos que una buena respuesta debería mencionar.';

  const text = await callBackend(SYS_GENERADOR, user);
  const r = parseJSON(text);
  return Array.isArray(r) ? r : [r];
}

export async function evaluarRespuestaOral(pregunta, respuestaEstudiante) {
  if (MOCK_MODE) return mockEvaluation(pregunta, respuestaEstudiante);

  const sys =
    "Eres uno de los dos miembros del tribunal académico de la Prueba de Grado Oral de Microbiología y Química " +
    "Clínica (Costa Rica). Evalúas con los criterios oficiales: dominio del contenido, claridad y coherencia en " +
    "la exposición, capacidad de análisis y argumentación, uso adecuado del vocabulario técnico, y actitud " +
    "profesional. Eres exigente pero constructivo. Responde ÚNICAMENTE con JSON válido, sin backticks.";
  const user =
    'Pregunta: "' +
    pregunta.pregunta +
    '"\nPuntos clave esperados: ' +
    pregunta.puntos_clave.join("; ") +
    '\n\nRespuesta de la estudiante (transcrita o escrita, tal cual la dio):\n"' +
    (respuestaEstudiante || "(sin respuesta)") +
    '"\n\nDevuelve SOLO este JSON:\n{"nota_estimada":"7/10","fortalezas":["...","..."],' +
    '"areas_mejora":["...","..."],"comentario_general":"..."}';

  const text = await callBackend(sys, user);
  return parseJSON(text);
}
