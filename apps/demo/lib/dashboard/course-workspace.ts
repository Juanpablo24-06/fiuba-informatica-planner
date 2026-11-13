import { formatEvaluationTemplate } from "@/lib/templates";
import { SCHEDULE_DAY_ORDER, sortScheduleSlots } from "@/lib/schedule";
import { mergeEventLinks } from "@/lib/dashboard/event-links";
import type {
  Enrollment,
  EnrollmentScheduleDay,
  EnrollmentScheduleSlot,
  Event,
  EventLink
} from "@/lib/types";

export type ScheduleBlockDraft = {
  days: EnrollmentScheduleDay[];
  start_time: string;
  end_time: string;
  location: string | null;
};

export type EventForm = {
  type: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  grade: string;
  status: string;
  attempt: string;
  linkLabel: string;
  linkUrl: string;
};

export const EMPTY_EVENT_FORM: EventForm = {
  type: "tp",
  title: "",
  description: "",
  starts_at: "",
  ends_at: "",
  grade: "",
  status: "",
  attempt: "1",
  linkLabel: "",
  linkUrl: ""
};

export const sortScheduleDays = (days: EnrollmentScheduleDay[]) =>
  [...new Set(days)].sort((a, b) => SCHEDULE_DAY_ORDER[a] - SCHEDULE_DAY_ORDER[b]);

export const slotsToDraftBlocks = (
  slots: EnrollmentScheduleSlot[]
): ScheduleBlockDraft[] => {
  if (!slots.length) return [];

  const blockMap = new Map<string, ScheduleBlockDraft>();
  for (const slot of sortScheduleSlots(slots)) {
    const key = `${slot.start_time}|${slot.end_time}|${slot.location ?? ""}`;
    const current = blockMap.get(key);
    if (!current) {
      blockMap.set(key, {
        days: [slot.day],
        start_time: slot.start_time,
        end_time: slot.end_time,
        location: slot.location ?? null
      });
      continue;
    }

    current.days = sortScheduleDays([...current.days, slot.day]);
  }

  return Array.from(blockMap.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
};

export const normalizeScheduleBlocks = (
  blocks: ScheduleBlockDraft[]
): ScheduleBlockDraft[] =>
  blocks.map((block) => ({
    days: sortScheduleDays(block.days),
    start_time: block.start_time,
    end_time: block.end_time,
    location: block.location?.trim() || null
  }));

export const validateScheduleBlocks = (blocks: ScheduleBlockDraft[]): string | null => {
  const hasInvalid = blocks.some(
    (slot) =>
      slot.days.length === 0 ||
      !slot.start_time ||
      !slot.end_time ||
      slot.start_time >= slot.end_time
  );

  return hasInvalid
    ? "Revisá el horario: cada bloque debe tener hora inicio menor a hora fin."
    : null;
};

export const draftBlocksToSlots = (
  blocks: ScheduleBlockDraft[]
): EnrollmentScheduleSlot[] => {
  const rows: EnrollmentScheduleSlot[] = [];

  for (const block of normalizeScheduleBlocks(blocks)) {
    for (const day of block.days) {
      rows.push({
        day,
        start_time: block.start_time,
        end_time: block.end_time,
        location: block.location
      });
    }
  }

  return sortScheduleSlots(rows);
};

export const toDatetimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const toIso = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const buildDescription = (enrollment: Enrollment) => {
  const subject = enrollment.subject;
  const lines: string[] = [];

  if (subject.template?.notas) {
    lines.push(subject.template.notas.trim());
  }

  if (subject.requirements?.length) {
    lines.push(`Requisitos generales: ${subject.requirements.join(" · ")}.`);
  }

  const meta: string[] = [];
  if (subject.credits) meta.push(`${subject.credits} créditos`);
  if (subject.weekly_hours) meta.push(`${subject.weekly_hours} h semanales`);
  if (subject.total_hours) meta.push(`${subject.total_hours} h totales`);
  if (subject.term_suggested) meta.push(`sugerida en cuatrimestre ${subject.term_suggested}`);
  if (meta.length) {
    lines.push(`Datos de cátedra: ${meta.join(" · ")}.`);
  }

  if (subject.template) {
    lines.push(`Plantilla de evaluación: ${formatEvaluationTemplate(subject.template)}.`);
  }

  return lines.length
    ? lines.join("\n\n")
    : "No hay descripción de plantilla cargada para esta materia. Podés sumar contexto en tus notas personales.";
};

export const buildEventPayload = ({
  enrollmentId,
  form,
  existingLinks
}: {
  enrollmentId: string;
  form: EventForm;
  existingLinks?: EventLink[] | null;
}) => ({
  enrollment_id: enrollmentId,
  type: form.type,
  title: form.title.trim() || null,
  description: form.description.trim() || null,
  starts_at: toIso(form.starts_at),
  ends_at: toIso(form.ends_at),
  grade: form.grade ? Number(form.grade) : null,
  status: form.status.trim() || null,
  attempt: form.attempt ? Number(form.attempt) : null,
  links: mergeEventLinks({
    existingLinks,
    label: form.linkLabel,
    url: form.linkUrl
  })
});

export const buildEventForm = (
  event: Event,
  primaryLink: { label: string; url: string }
): EventForm => ({
  type: event.type,
  title: event.title ?? "",
  description: event.description ?? "",
  starts_at: toDatetimeLocal(event.starts_at),
  ends_at: toDatetimeLocal(event.ends_at),
  grade: event.grade !== null ? String(event.grade) : "",
  status: event.status ?? "",
  attempt: event.attempt !== null ? String(event.attempt) : "",
  linkLabel: primaryLink.label,
  linkUrl: primaryLink.url
});
