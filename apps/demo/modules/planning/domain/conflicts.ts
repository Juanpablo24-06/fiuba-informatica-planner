import type { EnrollmentScheduleSlot } from "@/modules/academic/domain/types";

const minutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

export const findScheduleConflicts = (slots: EnrollmentScheduleSlot[]) => {
  const conflicts: string[] = [];
  for (let index = 0; index < slots.length; index += 1) {
    for (let other = index + 1; other < slots.length; other += 1) {
      const first = slots[index];
      const second = slots[other];
      if (first.day !== second.day) continue;
      if (minutes(first.start_time) < minutes(second.end_time) && minutes(second.start_time) < minutes(first.end_time)) {
        conflicts.push(`${first.day}:${first.start_time}-${first.end_time} / ${second.start_time}-${second.end_time}`);
      }
    }
  }
  return conflicts;
};
