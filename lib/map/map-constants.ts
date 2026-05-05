export const STATUS_STYLES: Record<string, string> = {
  cursando: "bg-accent/10 text-accent border-accent/40",
  final_pendiente: "bg-warning/10 text-warning border-warning/40",
  aprobado: "bg-success/10 text-success border-success/40",
  recursar: "bg-danger/10 text-danger border-danger/40"
};

export const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  final_pendiente: "Final pendiente",
  aprobado: "Aprobado",
  recursar: "Recursar"
};

export const CYCLE_LABELS: Record<string, string> = {
  cbc: "CBC",
  segundo: "Segundo ciclo"
};

export const MIN_ZOOM = 0.12;
export const MAX_ZOOM = 1.7;
export const ZOOM_FACTOR = 1.12;
export const DESKTOP_PANEL_WIDTH = 340;

export const WORLD_PADDING_X = 72;
export const WORLD_PADDING_Y = 52;
export const SECTION_GAP = 84;
export const SECTION_SIDE_PADDING = 16;
export const ROW_GAP = 18;
export const LANE_COUNT = 7;
export const NODE_WIDTH = 208;
export const NODE_MIN_HEIGHT = 108;
export const SLOT_GAP = 58;
export const ELECTIVE_COLUMN_GAP = 76;
export const ELECTIVE_GROUP_GAP = 96;
export const DRAG_THRESHOLD = 8;
export const MAP_VIEW_STORAGE_KEY = "fiuba-map-view-v2";
export const MAP_FINAL_TRACK_STORAGE_KEY = "fiuba-map-final-track-v1";
export const MAP_CBC_COLLAPSED_STORAGE_KEY = "fiuba-map-cbc-collapsed-v1";
export const MAP_ELECTIVES_VISIBLE_STORAGE_KEY = "fiuba-map-electives-visible-v1";
export const PAN_DRAG_MULTIPLIER = 1.18;
export const CBC_CLUSTER_NODE_ID = "__cbc__";
export const FINAL_PROJECT_NODE_ID = "__tif__";
export const GENERIC_ELECTIVE_NAMES = new Set(["Electivas/Optativas I", "Electivas/Optativas II"]);
export const CBC_SUBJECT_NAMES = new Set([
  "Introducción al Conocimiento de la Sociedad y el Estado",
  "Introducción al Pensamiento Científico",
  "Análisis Matemático A",
  "Álgebra A",
  "Física",
  "Pensamiento Computacional"
]);

export const OFFICIAL_ELECTIVE_ORDER = [
  "Lenguajes y Compiladores I",
  "Fundamentos Matemáticos de la Criptografía",
  "Criptografía I",
  "Criptografía II",
  "Sistemas Distribuidos II",
  "Técnicas de Ingeniería Inversa",
  "Criptoanálisis",
  "Ingeniería de Datos",
  "Optimización Convexa",
  "Aprendizaje Automático",
  "Aprendizaje Profundo",
  "Aprendizaje por Refuerzo",
  "Simulación",
  "Sistemas Complejos",
  "Redes Complejas",
  "Teoría Algorítmica de Juegos",
  "Teoría de Computabilidad",
  "Teoría de la Información",
  "Computación Cuántica",
  "Lenguajes y Compiladores II",
  "Análisis Matemático III",
  "Arquitectura de Software"
] as const;

export const OFFICIAL_REQUIRED_ORDER = [
  "Introducción al Conocimiento de la Sociedad y el Estado",
  "Introducción al Pensamiento Científico",
  "Análisis Matemático A",
  "Álgebra A",
  "Física",
  "Pensamiento Computacional",
  "Análisis Matemático II",
  "Fundamentos de Programación",
  "Introducción al Desarrollo de Software",
  "Álgebra Lineal",
  "Organización del Computador",
  "Algoritmos y Estructuras de Datos",
  "Paradigmas de Programación",
  "Probabilidad y Estadística",
  "Sistemas Operativos",
  "Teoría de Algoritmos",
  "Modelación Numérica",
  "Base de Datos",
  "Taller de Programación",
  "Ingeniería de Software I",
  "Ciencia de Datos",
  "Programación Concurrente",
  "Redes",
  "Gestión del Desarrollo de Sistemas Informáticos",
  "Física para Informática",
  "Empresas de Base Tecnológica I",
  "Ingeniería de Software II",
  "Sistemas Distribuidos I",
  "Taller de Seguridad Informática",
  "Empresas de Base Tecnológica II",
  "Trabajo Integrador Final"
] as const;

export const REQUIRED_ORDER_INDEX = new Map<string, number>(
  OFFICIAL_REQUIRED_ORDER.map((name, index) => [name, index])
);

export const ELECTIVE_ORDER_INDEX = new Map<string, number>(
  OFFICIAL_ELECTIVE_ORDER.map((name, index) => [name, index])
);

export const FIXED_NODE_POSITIONS = new Map<string, { column: number; lane: number }>([
  ["Introducción al Conocimiento de la Sociedad y el Estado", { column: 0, lane: 5.2 }],
  ["Introducción al Pensamiento Científico", { column: 1, lane: 5.2 }],
  ["Análisis Matemático A", { column: 0, lane: 1.1 }],
  ["Álgebra A", { column: 0, lane: 3.2 }],
  ["Física", { column: 1, lane: 1.1 }],
  ["Pensamiento Computacional", { column: 1, lane: 3.2 }],
  ["Ciclo Básico Común", { column: 2, lane: 3.1 }],
  ["Análisis Matemático II", { column: 0, lane: 0.3 }],
  ["Fundamentos de Programación", { column: 0, lane: 2.1 }],
  ["Introducción al Desarrollo de Software", { column: 0, lane: 4.1 }],
  ["Álgebra Lineal", { column: 0, lane: 0.3 }],
  ["Organización del Computador", { column: 0, lane: 2.1 }],
  ["Algoritmos y Estructuras de Datos", { column: 0, lane: 4.1 }],
  ["Paradigmas de Programación", { column: 0, lane: 0.2 }],
  ["Probabilidad y Estadística", { column: 0, lane: 2.1 }],
  ["Sistemas Operativos", { column: 0, lane: 4.1 }],
  ["Teoría de Algoritmos", { column: 0, lane: 6 }],
  ["Modelación Numérica", { column: 0, lane: 0.2 }],
  ["Base de Datos", { column: 0, lane: 2.1 }],
  ["Taller de Programación", { column: 0, lane: 4.1 }],
  ["Ingeniería de Software I", { column: 0, lane: 6 }],
  ["Ciencia de Datos", { column: 0, lane: 0.2 }],
  ["Programación Concurrente", { column: 0, lane: 2.1 }],
  ["Redes", { column: 0, lane: 4.1 }],
  ["Gestión del Desarrollo de Sistemas Informáticos", { column: 0, lane: 6 }],
  ["Física para Informática", { column: 0, lane: 0.2 }],
  ["Empresas de Base Tecnológica I", { column: 0, lane: 2.1 }],
  ["Ingeniería de Software II", { column: 0, lane: 4.1 }],
  ["Sistemas Distribuidos I", { column: 0, lane: 6 }],
  ["Taller de Seguridad Informática", { column: 0, lane: 4.1 }],
  ["Empresas de Base Tecnológica II", { column: 0, lane: 2.1 }],
  ["Trabajo Integrador Final", { column: 0, lane: 4.1 }],
  ["Lenguajes y Compiladores I", { column: 0, lane: 0.25 }],
  ["Sistemas Distribuidos II", { column: 0, lane: 2.05 }],
  ["Arquitectura de Software", { column: 0, lane: 3.85 }],
  ["Fundamentos Matemáticos de la Criptografía", { column: 1, lane: 0.55 }],
  ["Criptografía I", { column: 1, lane: 1.95 }],
  ["Criptografía II", { column: 1, lane: 3.25 }],
  ["Técnicas de Ingeniería Inversa", { column: 1, lane: 4.55 }],
  ["Criptoanálisis", { column: 1, lane: 5.85 }],
  ["Ingeniería de Datos", { column: 2, lane: 0.75 }],
  ["Optimización Convexa", { column: 2, lane: 2.25 }],
  ["Aprendizaje Automático", { column: 2, lane: 3.75 }],
  ["Simulación", { column: 3, lane: 0.55 }],
  ["Sistemas Complejos", { column: 3, lane: 1.95 }],
  ["Teoría Algorítmica de Juegos", { column: 3, lane: 3.35 }],
  ["Análisis Matemático III", { column: 3, lane: 4.75 }],
  ["Aprendizaje Profundo", { column: 1, lane: 0.55 }],
  ["Aprendizaje por Refuerzo", { column: 1, lane: 1.95 }],
  ["Lenguajes y Compiladores II", { column: 2, lane: 0.55 }],
  ["Redes Complejas", { column: 2, lane: 2.1 }],
  ["Teoría de Computabilidad", { column: 2, lane: 3.5 }],
  ["Teoría de la Información", { column: 2, lane: 4.85 }],
  ["Computación Cuántica", { column: 2, lane: 6 }]
]);
