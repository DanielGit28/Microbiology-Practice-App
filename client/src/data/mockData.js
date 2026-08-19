import { AREAS } from "./areas.js";

function pickTopic(area) {
  const parts = area.temas
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[Math.floor(Math.random() * parts.length)] || area.name;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockQuestion(area, dificultad) {
  const topic = pickTopic(area);
  const kevin = dificultad === "kevin";
  const prefix = kevin ? "[MOCK · Kevin] " : "[MOCK] ";
  return {
    area: area.name,
    pregunta:
      prefix +
      'Sobre "' +
      topic +
      '" en ' +
      area.name +
      ", ¿cuál de las siguientes afirmaciones es correcta? (pregunta de prueba, no es contenido real)",
    opciones: [
      "Opción A relacionada con " + topic,
      "Opción B relacionada con " + topic,
      "Opción C relacionada con " + topic,
      "Opción D relacionada con " + topic
    ],
    respuesta_correcta: Math.floor(Math.random() * 4),
    pista: "Pista simulada: piensa en los conceptos clave de " + topic + ".",
    explicacion:
      "Explicación simulada (MOCK): esta pregunta existe solo para probar el flujo de la app. Cuando conectes la API real, aquí aparecerá una explicación de verdad basada en el temario.",
    dificultad
  };
}

export function mockSimulacroBatch(areasConConteo) {
  return wait(400 + Math.random() * 400).then(() => {
    const out = [];
    areasConConteo.forEach((ac) => {
      for (let i = 0; i < ac.count; i++) {
        out.push(mockQuestion(ac.area, out.length % 2 === 0 ? "kevin" : "normal"));
      }
    });
    return out;
  });
}

export function mockPracticaQuestion(area, kevin) {
  return wait(400 + Math.random() * 400).then(() => mockQuestion(area, kevin ? "kevin" : "normal"));
}

export function mockExtendedExplanation(area) {
  return wait(400).then(
    () =>
      "Explicación extendida simulada (MOCK) sobre " +
      area.name +
      ": este texto sustituye la respuesta real de la API mientras pruebas el flujo de la aplicación. " +
      "Cuando conectes tu llave de Anthropic, aquí va a aparecer una explicación conceptual generada de verdad, " +
      "de 120 a 180 palabras, enfocada en el principio detrás de la pregunta y no solo en repetir la respuesta correcta."
  );
}

export function mockOralQuestions() {
  return wait(500).then(() => {
    const copia = [...AREAS];
    const muestra = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * copia.length);
      muestra.push(copia.splice(idx, 1)[0]);
    }
    return muestra.map((a) => ({
      area: a.name,
      pregunta:
        "[MOCK] Explique de forma integrada un aspecto clave de " +
        pickTopic(a) +
        " dentro de " +
        a.name +
        ".",
      puntos_clave: [
        "Punto clave simulado 1 sobre " + pickTopic(a),
        "Punto clave simulado 2",
        "Punto clave simulado 3"
      ]
    }));
  });
}

export function mockEvaluation(_pregunta, respuesta) {
  return wait(450).then(() => {
    const vacio = !respuesta || respuesta.trim().length < 5;
    return {
      nota_estimada: vacio ? "3/10" : "7/10",
      fortalezas: vacio
        ? ["(mock) Aún no hay suficiente texto para evaluar fortalezas."]
        : ["(mock) Mencionaste el área correcta.", "(mock) Estructura clara de la respuesta."],
      areas_mejora: vacio
        ? ["(mock) Escribe una respuesta más completa antes de evaluar."]
        : ["(mock) Profundizar en el mecanismo específico.", "(mock) Usar más vocabulario técnico."],
      comentario_general:
        "(mock) Retroalimentación simulada. Cuando conectes la API real, el tribunal virtual va a evaluar tu " +
        "respuesta de verdad según los criterios oficiales de la Prueba de Grado Oral."
    };
  });
}
