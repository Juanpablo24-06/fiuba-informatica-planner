import { eventCreateSchema, eventRangeIssue, eventUpdateSchema, hasValidEventRange, type EventCreateInput, type EventUpdateInput } from "../domain/events";
import { AcademicValidationError, parseAcademicInput } from "../domain/errors";
import type { EventFilters, EventRepository } from "./ports";

export const createEventService = (repository: EventRepository) => ({
  listEvents: (filters: EventFilters = {}) => repository.list(filters),
  createEvent: async (input: EventCreateInput) => repository.create(parseAcademicInput(eventCreateSchema, input)),
  updateEvent: async (id: string, patch: EventUpdateInput) => {
    const parsed = parseAcademicInput(eventUpdateSchema, patch);
    if (Object.keys(parsed).length === 0) throw new AcademicValidationError("No hay cambios para guardar.");
    if (parsed.starts_at !== undefined || parsed.ends_at !== undefined) {
      const current = await repository.getDates(id);
      if (!hasValidEventRange({ ...current, ...parsed })) throw new AcademicValidationError(eventRangeIssue.message);
    }
    return repository.update(id, parsed);
  },
  deleteEvent: (id: string) => repository.delete(id)
});
