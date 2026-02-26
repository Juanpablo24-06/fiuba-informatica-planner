import type { EnrollmentScheduleDay, EnrollmentScheduleSlot } from "@/lib/types";

export const SCHEDULE_DAY_ORDER: Record<EnrollmentScheduleDay, number> = {
  lun: 1,
  mar: 2,
  mie: 3,
  jue: 4,
  vie: 5,
  sab: 6
};

export const SCHEDULE_DAY_LABEL: Record<EnrollmentScheduleDay, string> = {
  lun: "Lun",
  mar: "Mar",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sab: "Sáb"
};

export const sortScheduleSlots = (slots: EnrollmentScheduleSlot[]) =>
  [...slots].sort((a, b) => {
    if (SCHEDULE_DAY_ORDER[a.day] !== SCHEDULE_DAY_ORDER[b.day]) {
      return SCHEDULE_DAY_ORDER[a.day] - SCHEDULE_DAY_ORDER[b.day];
    }
    return a.start_time.localeCompare(b.start_time);
  });

type GroupedScheduleBlock = {
  days: EnrollmentScheduleDay[];
  start_time: string;
  end_time: string;
  location: string | null;
};

export const groupScheduleSlots = (
  schedule: EnrollmentScheduleSlot[]
): GroupedScheduleBlock[] => {
  if (!schedule.length) return [];

  const grouped = new Map<string, GroupedScheduleBlock>();
  for (const slot of sortScheduleSlots(schedule)) {
    const key = `${slot.start_time}|${slot.end_time}|${slot.location ?? ""}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        days: [slot.day],
        start_time: slot.start_time,
        end_time: slot.end_time,
        location: slot.location ?? null
      });
      continue;
    }
    if (!current.days.includes(slot.day)) {
      current.days.push(slot.day);
      current.days.sort((a, b) => SCHEDULE_DAY_ORDER[a] - SCHEDULE_DAY_ORDER[b]);
    }
  }

  return [...grouped.values()].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );
};

export const formatSchedulePreview = (
  schedule: EnrollmentScheduleSlot[],
  {
    maxBlocks = 2,
    includeLocation = false
  }: {
    maxBlocks?: number;
    includeLocation?: boolean;
  } = {}
) => {
  if (!schedule.length) return "Sin horario semanal";

  const grouped = groupScheduleSlots(schedule);
  const preview = grouped
    .slice(0, maxBlocks)
    .map((block) => {
      const dayLabel = block.days.map((day) => SCHEDULE_DAY_LABEL[day]).join("/");
      const location = includeLocation && block.location ? ` (${block.location})` : "";
      return `${dayLabel} ${block.start_time}-${block.end_time}${location}`;
    })
    .join(" · ");

  const extra = grouped.length > maxBlocks ? ` +${grouped.length - maxBlocks}` : "";
  return `${preview}${extra}`;
};
