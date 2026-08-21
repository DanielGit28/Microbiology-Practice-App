export const AREAS = [
  {
    id: "bacteriologia",
    codigo: "BAC-10",
    name: "Bacteriología Clínica",
    peso: 10,
    temas:
      "Cocos y bacilos Gram positivos y negativos, fastidiosos, anaerobios, micobacterias, espiroquetas, bacterias intracelulares; tinciones (Gram, Ziehl-Neelsen); medios de cultivo selectivos y diferenciales; pruebas fenotípicas (TSI, oxidasa, catalasa, coagulasa, hemólisis, optoquina, bacitracina); Vitek, MALDI-TOF, PCR; síndromes clínicos (sepsis, ITU, SNC, respiratorio, piel, anaerobios, IAAS); mecanismos de resistencia antimicrobiana."
  },
  {
    id: "micologia",
    codigo: "MIC-10",
    name: "Micología Clínica",
    peso: 10,
    temas:
      "Micosis superficiales (dermatofitosis, pitiriasis versicolor), subcutáneas (esporotricosis, cromoblastomicosis, micetomas), profundas o sistémicas (histoplasmosis, coccidioidomicosis, paracoccidioidomicosis, blastomicosis), y oportunistas (candidiasis, criptococosis, aspergilosis, mucormicosis, neumocistosis); antifúngicos (azoles, equinocandinas, polienos) y pruebas de sensibilidad."
  },
  {
    id: "virologia",
    codigo: "VIR-10",
    name: "Virología Clínica",
    peso: 10,
    temas:
      "Clasificación de Baltimore; patogénesis e inmunología viral; oncogénesis (HPV, EBV, HTLV-1, hepatitis B y C); infecciones de SNC, respiratorias, exantemáticas, gastrointestinales, hepatitis virales, de transmisión sexual, en inmunocomprometidos (CMV, EBV, HHV), fiebres hemorrágicas y priones; técnicas moleculares (PCR, TMA, NASBA) y serológicas (ELISA, IFI, Western Blot)."
  },
  {
    id: "alimentos_aguas",
    codigo: "A&A-03",
    name: "Microbiología de Alimentos y Aguas",
    peso: 3,
    temas:
      "Enfermedades transmitidas por alimentos de origen bacteriano, viral y parasitario; toxinas (S. aureus, C. botulinum, B. cereus) y micotoxinas; microbiología del agua potable, residual y recreacional; métodos cuantitativos (recuento en placa, NMP) e indicadores (coliformes, E. coli, Enterococcus); análisis de patógenos (Salmonella, Listeria, E. coli O157:H7)."
  },
  {
    id: "farmaceutica",
    codigo: "FID-02",
    name: "Microbiología para la Industria Farmacéutica y Dispositivos Médicos",
    peso: 2,
    temas:
      "Cuartos limpios y ambientes controlados; sistemas de purificación de agua; métodos de esterilización (radiación, calor húmedo y seco, óxido de etileno); pruebas de esterilidad, carga bacteriana y endotoxinas; Media Fill; monitoreo ambiental."
  },
  {
    id: "genetica",
    codigo: "GBM-03",
    name: "Genética y Biología Molecular",
    peso: 3,
    temas:
      "Estructura de ácidos nucleicos; replicación, transcripción y traducción; regulación génica; mutaciones y alteraciones cromosómicas; patrones de herencia; técnicas moleculares (PCR, RT-PCR, qPCR, RFLP, STRs, secuenciación Sanger y NGS, cariotipo, FilmArray)."
  },
  {
    id: "procesos_industriales",
    codigo: "MPI-02",
    name: "Microbiología de Procesos Industriales y Ambientales",
    peso: 2,
    temas:
      "Procesos fermentativos discontinuos, continuos y fed-batch; biorreactores y parámetros físicos de control; microorganismos industriales relevantes; procesos de recuperación (downstream)."
  },
  {
    id: "protozoologia",
    codigo: "PTZ-06",
    name: "Protozoología Clínica",
    peso: 6,
    temas:
      "Amebas comensales y patógenas, amebas de vida libre (Naegleria, Acanthamoeba); flagelados (Giardia, Trichomonas, Leishmania, Trypanosoma); Apicomplexa (Cryptosporidium, Toxoplasma, Plasmodium, Babesia, Cyclospora, Cystoisospora); Balantidium coli; Dientamoeba fragilis."
  },
  {
    id: "helmintologia",
    codigo: "HLM-05",
    name: "Helmintología Clínica",
    peso: 5,
    temas:
      "Trematodos (Schistosoma, Fasciola, Paragonimus); cestodos (Taenia, Echinococcus, Diphyllobothrium, Hymenolepis, Dipylidium); nematodos (Ascaris, Trichuris, Strongyloides, Enterobius, Ancylostoma, Necator, Toxocara, Wuchereria, Onchocerca, Angiostrongylus)."
  },
  {
    id: "entomologia",
    codigo: "ENT-03",
    name: "Entomología Clínica",
    peso: 3,
    temas:
      "Artrópodos de importancia médica: piojos y pulgas, chinches y cucarachas, moscas y miasis, mosquitos (Culicidae), garrapatas (Ixodidae), ácaros y sarna, arañas y escorpiones; competencia y capacidad vectorial."
  },
  {
    id: "inmunologia",
    codigo: "INM-12",
    name: "Inmunología Clínica",
    peso: 12,
    temas:
      "Inmunidad innata y adaptativa; CMH y presentación antigénica; respuestas efectoras celulares y humorales; hipersensibilidad e inflamación crónica; autoinmunidad y trasplante; serología de enfermedades infecciosas (VIH, hepatitis, TORCH); técnicas (ELISA, citometría de flujo, ANA, anti-DNA, ENA, factor reumatoide, nefelometría)."
  },
  {
    id: "hematologia",
    codigo: "HEM-12",
    name: "Hematología",
    peso: 12,
    temas:
      "Anemias nutricionales, hemolíticas y hemoglobinopatías; neoplasias mieloides y linfoides según clasificación WHO 2022; hemostasia, cascada de coagulación, diátesis hemorrágica y trombosis; hemograma automatizado, índices hematimétricos, VES, citometría de flujo."
  },
  {
    id: "banco_sangre",
    codigo: "BST-10",
    name: "Banco de Sangre e Inmunohematología",
    peso: 10,
    temas:
      "Sistemas sanguíneos (ABO, Rh, Kell, Duffy, Kidd, MNS); pruebas de antiglobulina directa e indirecta; donación, tamizaje y pruebas pretransfusionales; reacciones adversas a la transfusión; enfermedad hemolítica del recién nacido; técnicas en tubo y gel."
  },
  {
    id: "bioquimica",
    codigo: "BQC-12",
    name: "Bioquímica Clínica",
    peso: 12,
    temas:
      "Proteínas plasmáticas, lípidos y lipoproteínas, carbohidratos y diabetes; enzimología clínica (DHL, CK, AST, ALT, GGT, ALP); función hepática y renal; equilibrio ácido-base; función tiroidea, adrenal y pituitaria; marcadores cardiovasculares y tumorales; urianálisis."
  }
];

export function areaById(id) {
  return AREAS.find((a) => a.id === id) || null;
}

// Reparte más preguntas a las áreas con más peso en el examen real.
export const SIMULACRO_PLAN = AREAS.map((area) => ({
  area,
  count: area.peso >= 10 ? 2 : 1
}));

export const SIMULACRO_TOTAL_SECS = 25 * 60;
export const ORAL_TOTAL_SECS = 30 * 60;
