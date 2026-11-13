export type ParsedCommissionSlot = {
  classType: string;
  day: string | null;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
};

export type ParsedCommission = {
  raw: string;
  name: string;
  schedule: string | null;
  activity: string;
  code: string | null;
  commission: string;
  shift: string | null;
  capacity: string | null;
  instance: string | null;
  location: string | null;
  teachers: string[];
  slots: ParsedCommissionSlot[];
};

export type OfferParsePreview = { rows: ParsedCommission[]; ignored: string[] };

const activityPattern = /^Actividad:\s*(.+?)\s*\(([^)]+)\)$/i;
const commissionPattern = /^Comisión:\s*(.+)$/i;
const slotPattern = /^(.+?)\s+(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\s+(\d{1,2}:\d{2})\s+a\s+(\d{1,2}:\d{2})\s+(.+)$/i;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();

// Parser for the plain-text export produced by FIUBA's "Oferta de comisiones".
// It keeps unknown lines in `ignored` so the user can review them before saving.
export const parseCommissionText = (text: string): OfferParsePreview => {
  const rows: ParsedCommission[] = [];
  const ignored: string[] = [];
  let activity = "Actividad sin identificar";
  let code: string | null = null;
  let current: ParsedCommission | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = clean(rawLine);
    if (!line) continue;
    const activityMatch = line.match(activityPattern);
    if (activityMatch) { activity = activityMatch[1]; code = activityMatch[2]; continue; }
    const commissionMatch = line.match(commissionPattern);
    if (commissionMatch) {
      current = { raw: line, name: clean(commissionMatch[1]), schedule: null, activity, code, commission: clean(commissionMatch[1]), shift: null, capacity: null, instance: null, location: null, teachers: [], slots: [] };
      rows.push(current);
      continue;
    }
    if (!current) { if (!/^(0|JUAN|PROPUESTA|PERFIL|OFERTA|FILTROS|Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo|Per[ií]odo|Actividad|Docente|Ubicaci[oó]n|Todos|Todas|Inscripci[oó]n|Reportes|Encuestas|Tr[aá]mites|Cursos)/i.test(line)) ignored.push(line); continue; }
    if (line.startsWith("Turno:")) current.shift = clean(line.replace("Turno:", ""));
    else if (line.startsWith("Cupo / insc.:")) current.capacity = clean(line.replace("Cupo / insc.:", ""));
    else if (line.startsWith("Instancias:")) current.instance = clean(line.replace("Instancias:", ""));
    else if (line.startsWith("Ubicación:")) current.location = clean(line.replace("Ubicación:", ""));
    else if (line.startsWith("Docentes:")) current.teachers = line.replace("Docentes:", "").split(/,\s*/).map(clean).filter(Boolean);
    else {
      const slot = line.match(slotPattern);
      if (slot) { current.slots.push({ classType: slot[1], day: slot[2], startTime: slot[3], endTime: slot[4], room: clean(slot[5]) }); current.schedule = `${slot[2]} ${slot[3]}–${slot[4]}`; }
      else if (!/^(Tipo de clase|D[ií]a|Horario|Aula|Sin definir|Per[ií]odo lectivo:)/i.test(line)) ignored.push(line);
    }
  }
  return { rows, ignored };
};
