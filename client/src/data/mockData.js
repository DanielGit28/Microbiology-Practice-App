// Banco de preguntas mock con contenido REAL de microbiología y química
// clínica (no plantillas de relleno). Es un set pequeño a propósito: sirve
// para probar el flujo completo de la app sin gastar API. Cuando conectes
// la API real (MOCK_MODE = false en src/api/api.js), vas a tener variedad
// infinita generada al momento.
//
// Cada área tiene: una pregunta "normal", una "kevin" (más integrativa /
// de distractores finos), y una pregunta abierta para el modo oral.
const MOCK_BANK = {
  bacteriologia: {
    normal: {
      pregunta: "¿Cuál prueba diferencia clásicamente a Staphylococcus aureus de los estafilococos coagulasa negativos (ECN)?",
      opciones: ["Catalasa", "Coagulasa", "Oxidasa", "Optoquina"],
      respuesta_correcta: 1,
      pista: "Piensa en qué distingue a S. aureus del resto del género Staphylococcus, no del género Streptococcus.",
      explicacion: "S. aureus es coagulasa positiva; los ECN (S. epidermidis, S. saprophyticus) son coagulasa negativos. La catalasa diferencia estafilococos (+) de estreptococos (-), no sirve para diferenciar especies dentro de Staphylococcus."
    },
    kevin: {
      pregunta: "Hemocultivo con diplococos Gram positivos, catalasa negativa, alfa-hemolíticos en agar sangre, sensibles a optoquina y solubles en bilis. ¿Cuál es el agente más probable?",
      opciones: ["Streptococcus mitis (grupo viridans)", "Streptococcus pneumoniae", "Streptococcus pyogenes", "Enterococcus faecalis"],
      respuesta_correcta: 1,
      pista: "Todos los estreptococos alfa-hemolíticos se parecen en el Gram; la clave está en dos pruebas fenotípicas específicas mencionadas en el caso.",
      explicacion: "La sensibilidad a optoquina y la solubilidad en bilis son las pruebas que distinguen a S. pneumoniae de otros estreptococos alfa-hemolíticos (grupo viridans), que son optoquina-resistentes y bilis-insolubles."
    },
    oral: {
      pregunta: "Explique el flujo diagnóstico ante un hemocultivo positivo con cocos Gram positivos en racimos, e indique qué pruebas usaría para diferenciar S. aureus de un estafilococo coagulasa negativo, y por qué esa diferencia es clínicamente relevante.",
      puntos_clave: [
        "Coagulasa (en tubo o en látex) como prueba diferenciadora clave",
        "S. aureus como patógeno más virulento vs ECN frecuentemente contaminante o asociado a dispositivos",
        "Considerar el contexto clínico (número de hemocultivos positivos, presencia de catéter) para diferenciar contaminación de infección verdadera",
        "Métodos confirmatorios como MALDI-TOF o Vitek"
      ]
    }
  },
  micologia: {
    normal: {
      pregunta: "¿Cuál es el agente causal más frecuente de la pitiriasis versicolor?",
      opciones: ["Trichophyton rubrum", "Malassezia furfur", "Candida albicans", "Microsporum canis"],
      respuesta_correcta: 1,
      pista: "Es una levadura lipofílica que forma parte de la flora normal de la piel, no un dermatofito.",
      explicacion: "La pitiriasis versicolor es causada por especies lipofílicas del género Malassezia (antes Pityrosporum), levaduras que forman parte de la flora cutánea normal."
    },
    kevin: {
      pregunta: "Paciente con VIH avanzado, lesiones cutáneas umbilicadas y fiebre; en tinta china de LCR se observan levaduras encapsuladas. ¿Diagnóstico más probable y prueba confirmatoria rápida?",
      opciones: [
        "Histoplasma capsulatum, antígeno urinario",
        "Cryptococcus neoformans, antígeno capsular (CrAg)",
        "Candida albicans, prueba del tubo germinativo",
        "Pneumocystis jirovecii, tinción de plata"
      ],
      respuesta_correcta: 1,
      pista: "Piensa en qué hongo tiene una cápsula visible con tinción negativa, y en qué prueba de antígeno se usa de forma estándar para confirmarlo en LCR.",
      explicacion: "La cápsula visible con tinta china es característica de Cryptococcus neoformans. La detección de antígeno capsular (CrAg, por látex o inmunocromatografía) en LCR o suero es la prueba rápida confirmatoria estándar."
    },
    oral: {
      pregunta: "Compare el abordaje diagnóstico de una micosis superficial versus una micosis sistémica oportunista en un paciente inmunocomprometido, mencionando toma de muestra y métodos de laboratorio en cada caso.",
      puntos_clave: [
        "Micosis superficiales: examen directo con KOH, cultivo en agar Sabouraud, muestra de piel/pelo/uñas",
        "Micosis oportunistas sistémicas: hemocultivos, detección de antígenos (galactomanano para Aspergillus, CrAg para Cryptococcus), biopsia",
        "Importancia del estado inmune del paciente en la interpretación",
        "Diferencias en tiempo de cultivo y bioseguridad según el hongo sospechado"
      ]
    }
  },
  virologia: {
    normal: {
      pregunta: "Según la clasificación de Baltimore, ¿en qué grupo se ubican los retrovirus como el VIH?",
      opciones: ["Grupo III (ARN bicatenario)", "Grupo IV (ARN monocatenario positivo)", "Grupo VI (ARN monocatenario positivo, retrotranscrito)", "Grupo VII (ADN bicatenario, retrotranscrito)"],
      respuesta_correcta: 2,
      pista: "Piensa en la enzima característica de estos virus y en qué distingue su clasificación de un virus ARN positivo común.",
      explicacion: "Los retrovirus (Grupo VI) tienen ARN monocatenario positivo, pero a diferencia del Grupo IV se replican mediante retrotranscripción a ADN usando la transcriptasa reversa."
    },
    kevin: {
      pregunta: "Paciente con faringitis, fiebre, adenopatías y linfocitos atípicos en frotis; el Monospot (anticuerpos heterófilos) es negativo pero la clínica es muy sugestiva de mononucleosis. ¿Explicación más probable y siguiente paso?",
      opciones: [
        "Descartar el diagnóstico, el Monospot es 100% sensible",
        "Sospechar EBV o CMV en fase temprana; solicitar serología específica (IgM VCA para EBV o IgM CMV)",
        "Repetir solo el cultivo viral",
        "Es diagnóstico definitivo de faringitis estreptocócica"
      ],
      respuesta_correcta: 1,
      pista: "El Monospot no es perfecto, sobre todo en fases tempranas o en niños. ¿Qué otro virus da un cuadro casi idéntico y qué prueba más específica existe para EBV?",
      explicacion: "El Monospot tiene sensibilidad limitada, especialmente en fases tempranas o en niños pequeños. Un cuadro mono-like con Monospot negativo obliga a descartar CMV o EBV con serología específica en vez de anticuerpos heterófilos."
    },
    oral: {
      pregunta: "Explique cómo participan la inmunidad innata y la adaptativa en el control de una infección viral aguda, y qué marcadores de laboratorio usaría para diferenciar una infección aguda de una pasada.",
      puntos_clave: [
        "Inmunidad innata: interferones, células NK, respuesta inflamatoria temprana",
        "Inmunidad adaptativa: linfocitos T citotóxicos y respuesta humoral con anticuerpos neutralizantes",
        "IgM como marcador de infección aguda/reciente vs IgG como marcador de infección pasada o inmunidad",
        "PCR para detección directa del genoma viral en fase aguda"
      ]
    }
  },
  alimentos_aguas: {
    normal: {
      pregunta: "¿Cuál microorganismo es el principal responsable de intoxicaciones alimentarias asociadas al consumo de arroz recalentado?",
      opciones: ["Salmonella enterica", "Bacillus cereus", "Clostridium botulinum", "Staphylococcus aureus"],
      respuesta_correcta: 1,
      pista: "Piensa en un microorganismo esporulado clásicamente asociado con el 'síndrome del arroz frito'.",
      explicacion: "Bacillus cereus forma esporas resistentes al calor y produce una toxina emética asociada clásicamente con arroz cocido mantenido a temperatura ambiente y recalentado."
    },
    kevin: {
      pregunta: "Un análisis de agua potable reporta ausencia de coliformes fecales pero presencia de coliformes totales. ¿Cómo interpreta el resultado?",
      opciones: [
        "El agua es segura sin duda, no se requiere ninguna acción",
        "Sugiere posible recontaminación o biofilm en la red de distribución; amerita investigar aunque no haya riesgo fecal inmediato",
        "Es un error de laboratorio, solo se repite sin más acción",
        "Confirma contaminación fecal directa y prohíbe el consumo de inmediato"
      ],
      respuesta_correcta: 1,
      pista: "No todos los coliformes totales indican origen fecal. Piensa en qué diferencia a los coliformes fecales del grupo total.",
      explicacion: "Los coliformes totales incluyen organismos ambientales no necesariamente fecales. Su presencia sin coliformes fecales sugiere problemas de la red (biofilms, recontaminación) más que contaminación fecal directa, pero igual amerita seguimiento."
    },
    oral: {
      pregunta: "Explique la diferencia entre un microorganismo indicador de calidad y uno indicador de inocuidad en alimentos, con un ejemplo de cada uno.",
      puntos_clave: [
        "Indicador de calidad: refleja condiciones de proceso/higiene general (ej. aerobios mesófilos, bacterias lácticas)",
        "Indicador de inocuidad: sugiere riesgo de patógenos o contaminación fecal (ej. E. coli, coliformes fecales)",
        "Un indicador no es un patógeno en sí, pero orienta el riesgo",
        "Ejemplo aplicado: enterobacterias como indicador de proceso vs E. coli como indicador de contaminación fecal"
      ]
    }
  },
  farmaceutica: {
    normal: {
      pregunta: "¿Cuál es el método de esterilización de elección para materiales termosensibles como muchos dispositivos médicos plásticos?",
      opciones: ["Calor húmedo (autoclave)", "Calor seco", "Óxido de etileno", "Incineración"],
      respuesta_correcta: 2,
      pista: "Piensa en el único método de la lista que no depende de altas temperaturas.",
      explicacion: "El óxido de etileno es un método de esterilización a baja temperatura, adecuado para materiales que no toleran el calor húmedo o seco, como muchos plásticos y dispositivos médicos sensibles."
    },
    kevin: {
      pregunta: "En un Media Fill se detectan 2 unidades contaminadas de 3000 llenadas. Según los criterios típicos de aceptación para procesos asépticos, ¿cómo se interpreta?",
      opciones: [
        "Es aceptable porque es menos del 1%",
        "Representa una falla del proceso; los criterios estándar exigen un límite mucho más estricto (prácticamente cero) para ese tamaño de lote",
        "Solo se repite el llenado de las 2 unidades contaminadas",
        "Es irrelevante si el resto del lote fue estéril"
      ],
      respuesta_correcta: 1,
      pista: "Los criterios de aceptación de un Media Fill son muchísimo más estrictos que un simple porcentaje bajo.",
      explicacion: "Para lotes de este tamaño, la guía estándar de la industria considera 1 unidad contaminada como causa de investigación y 2 o más como causa de revalidación tras investigar la causa raíz; 2 de 3000 se considera una falla significativa."
    },
    oral: {
      pregunta: "Describa el propósito de un programa de monitoreo ambiental en un cuarto limpio farmacéutico y qué tipo de muestras se recolectan.",
      puntos_clave: [
        "Objetivo: verificar que el ambiente controlado mantiene los niveles de limpieza microbiológica requeridos según su clasificación",
        "Muestras de aire ambiental, superficies (placas de contacto o hisopos) y aire comprimido",
        "Establecimiento de límites de alerta y acción para detectar desviaciones a tiempo",
        "Relación con la prueba de esterilidad y el Media Fill dentro del sistema de calidad"
      ]
    }
  },
  genetica: {
    normal: {
      pregunta: "¿Cuál técnica permite cuantificar en tiempo real la cantidad de ADN o ARN presente en una muestra durante la amplificación?",
      opciones: ["PCR convencional", "qPCR (PCR en tiempo real)", "Electroforesis en gel", "Secuenciación Sanger"],
      respuesta_correcta: 1,
      pista: "Piensa en qué técnica permite 'ver' la amplificación mientras ocurre, ciclo por ciclo.",
      explicacion: "La qPCR usa fluorescencia para monitorear la amplificación en cada ciclo, permitiendo cuantificar la cantidad inicial de material genético, a diferencia de la PCR convencional que solo se lee al final en gel."
    },
    kevin: {
      pregunta: "Se necesita cuantificar una carga viral de bajo título con alta sensibilidad, sin amplificar el ácido nucleico mediante ciclos térmicos. ¿Qué técnica es la más adecuada?",
      opciones: ["PCR convencional", "ADN ramificado (bDNA)", "Electroforesis en gel", "Cariotipo"],
      respuesta_correcta: 1,
      pista: "Hay técnicas que amplifican el ácido nucleico (como PCR) y otras que amplifican la señal sin ciclos térmicos. ¿Cuál es cuál?",
      explicacion: "El ADN ramificado (bDNA) es una técnica de amplificación de señal, no del ácido nucleico, que permite cuantificar sin ciclos térmicos de amplificación, a diferencia de PCR, TMA o NASBA."
    },
    oral: {
      pregunta: "Explique la diferencia entre una mutación puntual y un polimorfismo, y por qué esta distinción es relevante en el diagnóstico molecular.",
      puntos_clave: [
        "Mutación: cambio en la secuencia de ADN, potencialmente asociado a enfermedad, generalmente de baja frecuencia poblacional",
        "Polimorfismo: variante genética presente en más del 1% de la población, generalmente sin efecto patológico significativo",
        "Relevancia clínica: distinguir variantes causales de enfermedad vs variación genética normal",
        "Ejemplos de aplicación en pruebas moleculares (STRs, SNPs) para identificación o diagnóstico"
      ]
    }
  },
  procesos_industriales: {
    normal: {
      pregunta: "¿Cuál es la principal ventaja de un proceso fermentativo fed-batch sobre uno discontinuo (batch)?",
      opciones: [
        "No requiere control de parámetros físicos",
        "Permite alimentar sustrato de forma controlada, prolongando la fase de producción y aumentando el rendimiento",
        "Es más barato porque no usa biorreactor",
        "Elimina la necesidad de esterilización"
      ],
      respuesta_correcta: 1,
      pista: "Piensa en qué pasa con el sustrato en un batch normal (todo se agrega al inicio) versus en un fed-batch.",
      explicacion: "En el fed-batch se añade sustrato de forma controlada durante el proceso, evitando inhibición por sustrato o acumulación de subproductos tóxicos que limitan un proceso batch tradicional, prolongando la fase productiva."
    },
    kevin: {
      pregunta: "En un biorreactor, el oxígeno disuelto (DO) cae súbitamente durante la fase exponencial de crecimiento, sin cambios en agitación ni flujo de aire. ¿Explicación más probable?",
      opciones: [
        "Falla del sensor únicamente",
        "El aumento en la demanda de oxígeno por el crecimiento exponencial de la biomasa supera la capacidad de transferencia de oxígeno del sistema",
        "Contaminación por hongos",
        "Exceso de antiespumante"
      ],
      respuesta_correcta: 1,
      pista: "La fase exponencial de crecimiento tiene un efecto directo y predecible sobre la demanda de un parámetro físico clave del biorreactor.",
      explicacion: "Durante la fase exponencial, la demanda de oxígeno de la biomasa puede superar la capacidad de transferencia de oxígeno (kLa) del biorreactor, causando una caída del DO; es esperado y requiere ajustar agitación/aireación."
    },
    oral: {
      pregunta: "Describa las etapas generales de un proceso de recuperación (downstream processing) en un proceso fermentativo industrial.",
      puntos_clave: [
        "Separación de biomasa del caldo de fermentación (centrifugación, filtración)",
        "Purificación del producto de interés (extracción, cromatografía, precipitación)",
        "Concentración y acondicionamiento final del producto",
        "Consideraciones de escalado y costo asociadas a cada etapa"
      ]
    }
  },
  protozoologia: {
    normal: {
      pregunta: "¿Cuál es el método diagnóstico de elección para detectar Cryptosporidium spp. en heces?",
      opciones: ["Examen directo con solución salina", "Tinción de Ziehl-Neelsen modificada (ácido-alcohol resistencia)", "Tinción de Giemsa", "Cultivo en medios especiales"],
      respuesta_correcta: 1,
      pista: "Este parásito pertenece al mismo grupo de tinción que se usa clásicamente para micobacterias.",
      explicacion: "Los ooquistes de Cryptosporidium son ácido-alcohol resistentes, por lo que se identifican con tinción de Ziehl-Neelsen modificada; no se cultiva de forma rutinaria en el laboratorio clínico."
    },
    kevin: {
      pregunta: "Paciente con disentería y antecedente de viaje a zona endémica; en heces se observan quistes tetranucleados con cuerpos cromatoidales de bordes romos (extremos redondeados). ¿Diagnóstico y con qué debe diferenciarse cuidadosamente?",
      opciones: [
        "Entamoeba histolytica; debe diferenciarse de Entamoeba dispar (no patógena, morfológicamente idéntica)",
        "Giardia lamblia; diferenciar de Chilomastix mesnili",
        "Balantidium coli; diferenciar de Blastocystis spp.",
        "Toxoplasma gondii; diferenciar de Cystoisospora belli"
      ],
      respuesta_correcta: 0,
      pista: "Hay un par de especies de amebas que se ven exactamente iguales al microscopio, pero solo una de ellas causa enfermedad. ¿Cómo se distinguen en la práctica?",
      explicacion: "Los cuerpos cromatoidales de bordes romos y la tetranucleación son característicos de E. histolytica/E. dispar. Ambas especies son morfológicamente idénticas al microscopio y solo se diferencian con métodos moleculares o de antígeno; E. histolytica es la especie patógena."
    },
    oral: {
      pregunta: "Explique por qué el examen microscópico directo de heces no siempre es suficiente para el diagnóstico de una infección por protozoarios, y qué otras herramientas diagnósticas existen.",
      puntos_clave: [
        "Limitaciones del examen directo: baja sensibilidad, dependencia del observador, necesidad de muestras seriadas",
        "Casos donde especies morfológicamente idénticas requieren diferenciación molecular o antigénica (E. histolytica vs E. dispar)",
        "Uso de técnicas de concentración para aumentar sensibilidad",
        "Pruebas complementarias: ELISA de antígeno en heces, PCR, serología según el parásito sospechado"
      ]
    }
  },
  helmintologia: {
    normal: {
      pregunta: "¿Cuál helminto se asocia clásicamente con anemia ferropénica por su hábito de succionar sangre en el intestino?",
      opciones: ["Ascaris lumbricoides", "Ancylostoma duodenale", "Enterobius vermicularis", "Trichuris trichiura (en infecciones leves)"],
      respuesta_correcta: 1,
      pista: "Piensa en el helminto cuyo nombre común hace referencia directa a su hábito hematófago.",
      explicacion: "Los uncinarios (Ancylostoma duodenale y Necator americanus) se adhieren a la mucosa intestinal y se alimentan de sangre, siendo causa clásica de anemia ferropénica en infecciones crónicas o de alta carga."
    },
    kevin: {
      pregunta: "Paciente con eosinofilia, síntomas respiratorios tipo asmatiforme (síndrome de Löffler) y antecedente de caminar descalzo en tierra contaminada, seguido días después de síntomas gastrointestinales. ¿Qué ciclo biológico explica mejor esta secuencia?",
      opciones: [
        "Enterobius vermicularis, con ciclo ano-mano-boca directo",
        "Un helminto cuyas larvas penetran la piel, migran por vía pulmonar (causando el síndrome de Löffler) y luego son deglutidas para completar su ciclo intestinal",
        "Taenia solium, por consumo de carne mal cocida",
        "Trichuris trichiura, sin fase pulmonar"
      ],
      respuesta_correcta: 1,
      pista: "Hay un grupo de helmintos cuyas larvas 'pasan por el pulmón' antes de llegar al intestino. ¿Cuál vía de entrada coincide con el antecedente de caminar descalzo?",
      explicacion: "El síndrome de Löffler (infiltrados pulmonares con eosinofilia) es típico de helmintos con migración pulmonar larvaria antes de establecerse en el intestino, como Ascaris, Ancylostoma/Necator o Strongyloides; la penetración cutánea apunta a un ciclo con entrada activa por la piel."
    },
    oral: {
      pregunta: "Compare el mecanismo de infección de un helminto que se transmite por ingestión de huevos con uno que penetra activamente la piel, y explique las implicaciones para la prevención.",
      puntos_clave: [
        "Ingestión de huevos: contaminación fecal-oral, ej. Ascaris, Trichuris, Enterobius",
        "Penetración cutánea activa: contacto con suelo contaminado, ej. Ancylostoma, Necator, Strongyloides",
        "Implicaciones de prevención: higiene de manos/alimentos vs uso de calzado y saneamiento del suelo",
        "Relación con el ciclo de migración pulmonar en varios de estos helmintos"
      ]
    }
  },
  entomologia: {
    normal: {
      pregunta: "¿Cuál artrópodo es el vector biológico de la enfermedad de Chagas (Trypanosoma cruzi)?",
      opciones: ["Anopheles spp.", "Triatoma spp. (chinche besucona/pitilla)", "Aedes aegypti", "Ixodes spp."],
      respuesta_correcta: 1,
      pista: "Este vector es una chinche, no un mosquito ni una garrapata, y transmite el parásito a través de sus heces, no de la picadura en sí.",
      explicacion: "Los triatominos (como Triatoma dimidiata) son vectores biológicos de Trypanosoma cruzi; el parásito se transmite mediante las heces del insecto durante o después de la picadura."
    },
    kevin: {
      pregunta: "Paciente con una garrapata adherida presenta fiebre, cefalea y exantema maculopapular que se extiende de forma centrípeta desde muñecas y tobillos hacia el tronco. ¿Agente más probable y característica clave del vector?",
      opciones: [
        "Borrelia burgdorferi por Ixodes; sería un eritema migratorio, no centrípeto",
        "Rickettsia rickettsii por garrapatas Ixodidae; requiere varias horas de adherencia para transmisión efectiva",
        "Ehrlichia chaffeensis sin relación con garrapatas",
        "Plasmodium spp., transmitido por la misma garrapata"
      ],
      respuesta_correcta: 1,
      pista: "El patrón de distribución del exantema (de dónde hacia dónde se extiende) es la pista clave para diferenciar esta rickettsiosis de otras enfermedades transmitidas por garrapatas.",
      explicacion: "El exantema centrípeto (de extremidades hacia tronco) es característico de la fiebre manchada de las Montañas Rocosas (Rickettsia rickettsii), transmitida por garrapatas Ixodidae, cuya transmisión efectiva suele requerir adherencia prolongada."
    },
    oral: {
      pregunta: "Explique la diferencia entre un vector biológico y un vector mecánico de enfermedades, con un ejemplo de cada uno.",
      puntos_clave: [
        "Vector biológico: el patógeno se multiplica o completa parte de su ciclo dentro del vector (ej. Anopheles y Plasmodium)",
        "Vector mecánico: transporta pasivamente al patógeno sin que este se multiplique en él (ej. moscas y bacterias entéricas)",
        "Relevancia para estrategias de control vectorial distintas según el tipo de transmisión",
        "Concepto de competencia vectorial y capacidad vectorial"
      ]
    }
  },
  inmunologia: {
    normal: {
      pregunta: "¿Qué tipo de hipersensibilidad, según Gell y Coombs, corresponde a una reacción anafiláctica mediada por IgE?",
      opciones: ["Tipo I", "Tipo II", "Tipo III", "Tipo IV"],
      respuesta_correcta: 0,
      pista: "Es el tipo de hipersensibilidad 'inmediata', mediado por un anticuerpo específico asociado a alergias.",
      explicacion: "La hipersensibilidad tipo I es mediada por IgE unida a mastocitos y basófilos; la reexposición al alérgeno libera histamina y otros mediadores, causando reacciones inmediatas como la anafilaxia."
    },
    kevin: {
      pregunta: "Paciente con lupus eritematoso sistémico presenta anti-DNA de doble hebra positivo y C3/C4 bajos. ¿Cómo se relacionan fisiopatológicamente estos hallazgos?",
      opciones: [
        "No están relacionados, son hallazgos independientes",
        "Los inmunocomplejos de anti-DNA con DNA activan la vía clásica del complemento, consumiéndolo y explicando el C3/C4 bajo",
        "El complemento bajo causa la producción de anti-DNA",
        "Ambos hallazgos reflejan solo daño hepático"
      ],
      respuesta_correcta: 1,
      pista: "Piensa en qué le pasa al complemento cuando hay muchos inmunocomplejos circulando activamente.",
      explicacion: "Los inmunocomplejos circulantes (anti-DNA unido a DNA) activan la vía clásica del complemento, consumiéndolo; esto explica los niveles bajos de C3/C4, un patrón útil para monitorizar actividad de la enfermedad."
    },
    oral: {
      pregunta: "Explique el concepto de tolerancia inmunológica y por qué su falla se relaciona con el desarrollo de enfermedades autoinmunes.",
      puntos_clave: [
        "Tolerancia central: eliminación de clones autorreactivos en timo y médula ósea",
        "Tolerancia periférica: anergia, supresión por linfocitos T reguladores, ignorancia clonal",
        "La falla de estos mecanismos permite la sobrevivencia de clones autorreactivos",
        "Ejemplo clínico: enfermedades autoinmunes y su relación con autoanticuerpos (ANA, anti-DNA, etc.)"
      ]
    }
  },
  hematologia: {
    normal: {
      pregunta: "¿Cuál es el hallazgo característico en el frotis de sangre periférica de un paciente con anemia ferropénica?",
      opciones: ["Macrocitosis con megaloblastos", "Microcitosis e hipocromía", "Esferocitos", "Dianocitos únicamente"],
      respuesta_correcta: 1,
      pista: "Piensa en cómo afecta la falta de hierro al tamaño y color de los glóbulos rojos.",
      explicacion: "La anemia ferropénica se caracteriza por microcitosis (VCM bajo) e hipocromía (HCM baja), reflejando la síntesis deficiente de hemoglobina por falta de hierro disponible."
    },
    kevin: {
      pregunta: "Un paciente con pancitopenia tiene, en el aspirado de médula ósea, blastos con bastones de Auer positivos para mieloperoxidasa. ¿A qué categoría pertenece y qué lo diferencia de una neoplasia linfoide aguda?",
      opciones: [
        "Neoplasia mieloide aguda; los bastones de Auer y la mieloperoxidasa son característicos del linaje mieloide",
        "Neoplasia linfoide aguda, cualquier blasto en médula es de origen linfoide",
        "Síndrome mielodisplásico exclusivamente, sin relación con leucemia aguda",
        "Discrasia de células plasmáticas"
      ],
      respuesta_correcta: 0,
      pista: "Hay una estructura citoplasmática específica en los blastos que es prácticamente exclusiva del linaje mieloide.",
      explicacion: "Los bastones de Auer y la positividad para mieloperoxidasa son marcadores característicos de blastos de origen mieloide, diferenciándolos de los blastos linfoides, que no presentan estos hallazgos."
    },
    oral: {
      pregunta: "Explique cómo el hemograma automatizado y sus índices hematimétricos ayudan a clasificar y orientar el diagnóstico diferencial de una anemia.",
      puntos_clave: [
        "VCM para clasificar anemias en microcíticas, normocíticas o macrocíticas",
        "HCM y CHCM para evaluar el contenido de hemoglobina (hipocrómica vs normocrómica)",
        "Índice reticulocitario para diferenciar anemias regenerativas de arregenerativas",
        "Correlación con posibles causas: ferropénica, megaloblástica, hemolítica, entre otras"
      ]
    }
  },
  banco_sangre: {
    normal: {
      pregunta: "¿Qué prueba detecta anticuerpos ya unidos a los glóbulos rojos del paciente, como en la enfermedad hemolítica del recién nacido?",
      opciones: ["Prueba de antiglobulina indirecta (Coombs indirecto)", "Prueba de antiglobulina directa (Coombs directo)", "Titulación de anticuerpos", "Prueba de compatibilidad cruzada"],
      respuesta_correcta: 1,
      pista: "Piensa en cuál prueba busca anticuerpos que YA están pegados a los glóbulos rojos del paciente, y cuál busca anticuerpos libres en el suero.",
      explicacion: "El Coombs directo detecta anticuerpos o complemento ya adheridos in vivo a los glóbulos rojos del paciente, a diferencia del Coombs indirecto, que detecta anticuerpos libres en el suero."
    },
    kevin: {
      pregunta: "Madre Rh negativo en su segundo embarazo (feto Rh positivo) tiene Coombs indirecto positivo en el control prenatal. ¿Qué implica y qué medida preventiva debió considerarse antes?",
      opciones: [
        "Indica que la madre ya está sensibilizada (anti-D); la profilaxis con inmunoglobulina anti-D debió administrarse tras el primer embarazo o evento sensibilizante",
        "Es un hallazgo normal en cualquier embarazo Rh negativo",
        "Indica incompatibilidad ABO, no Rh",
        "No tiene relación con la enfermedad hemolítica del recién nacido"
      ],
      respuesta_correcta: 0,
      pista: "Existe una profilaxis específica que se administra a madres Rh negativo para evitar justamente esta sensibilización.",
      explicacion: "Un Coombs indirecto positivo en una madre Rh negativo indica sensibilización previa (anticuerpos anti-D), que pudo prevenirse con inmunoglobulina anti-D (RhoGAM) tras el primer embarazo o evento sensibilizante."
    },
    oral: {
      pregunta: "Explique por qué es importante determinar tanto el grupo ABO como el Rh antes de una transfusión, y qué reacciones adversas pueden ocurrir si esto no se hace correctamente.",
      puntos_clave: [
        "Anticuerpos naturales del sistema ABO pueden causar hemólisis intravascular aguda grave si hay incompatibilidad",
        "El antígeno Rh(D) es altamente inmunogénico y puede sensibilizar al receptor generando anti-D",
        "Reacciones hemolíticas transfusionales agudas vs tardías según el mecanismo",
        "Relevancia de las pruebas cruzadas de compatibilidad antes de transfundir"
      ]
    }
  },
  bioquimica: {
    normal: {
      pregunta: "¿Cuál enzima es más específica para evaluar daño hepatocelular, dado que se encuentra predominantemente en el hígado?",
      opciones: ["AST (aspartato aminotransferasa)", "ALT (alanino aminotransferasa)", "Fosfatasa alcalina (ALP)", "Amilasa"],
      respuesta_correcta: 1,
      pista: "Piensa en cuál de las dos transaminasas clásicas es más 'hepato-específica'.",
      explicacion: "La ALT es más específica de daño hepatocelular porque se encuentra predominantemente en el hígado, mientras que la AST también está en músculo cardíaco y esquelético, siendo menos específica."
    },
    kevin: {
      pregunta: "Paciente con hiperbilirrubinemia predominantemente indirecta, sin coluria, hemoglobina baja y reticulocitos elevados. ¿Explicación fisiopatológica y por qué no hay coluria?",
      opciones: [
        "Obstrucción de la vía biliar; debería haber coluria por bilirrubina conjugada",
        "Hemólisis aumentada; la bilirrubina indirecta no conjugada es liposoluble, no se filtra por el riñón y no aparece en orina",
        "Daño hepatocelular difuso",
        "Deficiencia de vitamina B12 sin relación con la bilirrubina"
      ],
      respuesta_correcta: 1,
      pista: "La bilirrubina indirecta y la directa tienen solubilidades muy distintas. ¿Cuál de las dos puede aparecer en la orina y cuál no?",
      explicacion: "La bilirrubina indirecta (no conjugada) es liposoluble y está unida a albúmina, por lo que no se filtra por el glomérulo y no aparece en orina; esto es consistente con un cuadro hemolítico, respaldado por anemia y reticulocitosis compensatoria."
    },
    oral: {
      pregunta: "Explique la diferencia fisiopatológica entre bilirrubina directa e indirecta, y cómo esta distinción orienta el diagnóstico diferencial de una ictericia.",
      puntos_clave: [
        "Bilirrubina indirecta: liposoluble, unida a albúmina, elevada en hemólisis o alteraciones de la conjugación",
        "Bilirrubina directa: hidrosoluble, elevada en obstrucción biliar o daño hepatocelular con colestasis",
        "Presencia o ausencia de coluria como pista clínica según el tipo predominante",
        "Relación con otras pruebas de función hepática (transaminasas, fosfatasa alcalina) para localizar la causa"
      ]
    }
  }
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bankQuestion(area, dificultad) {
  const q = MOCK_BANK[area.id][dificultad];
  return {
    area: area.name,
    pregunta: q.pregunta,
    opciones: q.opciones,
    respuesta_correcta: q.respuesta_correcta,
    pista: q.pista,
    explicacion: q.explicacion,
    dificultad
  };
}

export function mockSimulacroBatch(areasConConteo) {
  return wait(300 + Math.random() * 300).then(() => {
    const out = [];
    areasConConteo.forEach((ac) => {
      if (ac.count >= 2) {
        out.push(bankQuestion(ac.area, "normal"));
        out.push(bankQuestion(ac.area, "kevin"));
        for (let i = 2; i < ac.count; i++) {
          out.push(bankQuestion(ac.area, i % 2 === 0 ? "normal" : "kevin"));
        }
      } else {
        out.push(bankQuestion(ac.area, Math.random() < 0.5 ? "normal" : "kevin"));
      }
    });
    return out;
  });
}

// Nota: al ser un banco fijo (1 pregunta normal + 1 kevin por área), volver a
// pedir "nuevo caso" sin cambiar de área ni de Modo Kevin va a repetir las
// mismas preguntas — es esperado en este mock chiquito. Con la API real vas a
// tener casos y variedad infinitos.
export function mockCasoPractica(area, kevin) {
  return wait(300 + Math.random() * 300).then(() => {
    const dificultad = kevin ? "kevin" : "normal";
    const base = bankQuestion(area, dificultad);
    return {
      caso:
        "(mock) Caso de " +
        area.name +
        ": paciente con hallazgos compatibles con el escenario descrito a continuación en cada pregunta.",
      preguntas: [0, 1, 2].map((i) => ({ ...base, pregunta: base.pregunta + (i > 0 ? " (variante " + (i + 1) + ")" : "") }))
    };
  });
}

export function mockExtendedExplanation(area, pregunta) {
  return wait(350).then(() => {
    const base = pregunta && pregunta.explicacion ? pregunta.explicacion : "";
    return (
      base +
      " Para dominar este tema, enfócate en el principio general detrás de la pregunta (no solo en memorizar la " +
      "respuesta puntual), y repásalo cruzando con los otros conceptos de " +
      area.name +
      " que suelen aparecer combinados en preguntas integrativas. (Nota: esto es un mock construido sobre la " +
      "explicación de la pregunta; con la API real vas a recibir una explicación conceptual distinta y más " +
      "completa cada vez.)"
    );
  });
}

export function mockCasoOral(area) {
  return wait(400).then(() => {
    const oral = MOCK_BANK[area.id].oral;
    return {
      caso:
        "(mock) Caso de " +
        area.name +
        ": paciente con hallazgos compatibles con el escenario que se integra en cada pregunta a continuación.",
      preguntas: [0, 1, 2].map((i) => ({
        pregunta: oral.pregunta + (i > 0 ? " (variante " + (i + 1) + ")" : ""),
        puntos_clave: oral.puntos_clave
      }))
    };
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