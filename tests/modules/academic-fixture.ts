import { vi } from "vitest";
import { createAcademicService } from "@/modules/academic/application/service";
import type { Term, Subject, Event } from "@/modules/academic/domain/types";
import type { TermRepository, SubjectRepository, EnrollmentRepository, EnrollmentRecord, EventRepository } from "@/modules/academic/application/ports";

export const termId = "123e4567-e89b-12d3-a456-426614174000";
export const subjectId = "123e4567-e89b-12d3-a456-426614174001";
export const enrollmentId = "123e4567-e89b-12d3-a456-426614174002";
export const eventId = "123e4567-e89b-12d3-a456-426614174003";
export const subjectFixture = (id = subjectId, name = "Algoritmos", code = "61.08"): Subject => ({ id, name, code, credits: 6, weekly_hours: 6, total_hours: null, term_suggested: null, cycle: null, type: null, requirements: [], template: null, deleted_at: null });

export const makeAcademicFixture = () => {
  const terms = new Map<string, Term>([[termId, { id: termId, label: "2026-1", start_date: "2026-03-10", end_date: "2026-07-15", is_current: true }]]);
  const subjects = new Map<string, Subject>([[subjectId, subjectFixture()]]);
  const enrollments = new Map<string, EnrollmentRecord>([[enrollmentId, { id: enrollmentId, term_id: termId, subject_id: subjectId, status: "cursando", color: null, notes: null, schedule: [] }]]);
  const events = new Map<string, Event>([[eventId, { id: eventId, enrollment_id: enrollmentId, type: "parcial", title: "Parcial 1", description: null, starts_at: "2026-04-10T19:00:00Z", ends_at: "2026-04-10T21:00:00Z", status: null, grade: null, attempt: 1, links: [] }]]);
  const relations = new Map<string, { prerequisiteIds: string[]; unlockIds: string[] }>();
  const termRepository = {
    list: vi.fn<TermRepository["list"]>(async () => [...terms.values()].map((term) => ({ ...term }))),
    getDates: vi.fn<TermRepository["getDates"]>(async (id: string) => terms.has(id) ? { ...terms.get(id)! } : null),
    clearCurrent: vi.fn<TermRepository["clearCurrent"]>(async (except?: string) => { for (const term of terms.values()) if (term.id !== except) term.is_current = false; }),
    create: vi.fn<TermRepository["create"]>(async (input) => { const term = { id: crypto.randomUUID(), label: input.label, start_date: input.start_date ?? null, end_date: input.end_date ?? null, is_current: input.is_current ?? false }; terms.set(term.id, term); return term; }),
    update: vi.fn<TermRepository["update"]>(async (id, patch) => { const current = terms.get(id); if (!current) return null; const next = { ...current, ...patch }; terms.set(id, next); return next; }),
    delete: vi.fn<TermRepository["delete"]>(async (id) => { terms.delete(id); })
  } satisfies TermRepository;
  const subjectRepository = {
    list: vi.fn<SubjectRepository["list"]>(async (options) => [...subjects.values()].filter((subject) => options?.includeDeleted || !subject.deleted_at).map((subject) => ({ ...subject }))),
    listDeleted: vi.fn<SubjectRepository["listDeleted"]>(async () => [...subjects.values()].filter((subject) => subject.deleted_at)),
    create: vi.fn<SubjectRepository["create"]>(async (input) => { const subject = { ...subjectFixture(crypto.randomUUID(), input.name, input.code ?? ""), ...input }; subjects.set(subject.id, subject); return subject; }),
    update: vi.fn<SubjectRepository["update"]>(async (id, input) => { const subject = { ...subjects.get(id)!, ...input }; subjects.set(id, subject); return subject; }),
    delete: vi.fn<SubjectRepository["delete"]>(async (id) => { const subject = subjects.get(id); if (!subject || subject.deleted_at) return null; subject.deleted_at = "2026-10-03"; return { ...subject }; }),
    restore: vi.fn<SubjectRepository["restore"]>(async (id) => { const subject = subjects.get(id); if (!subject || !subject.deleted_at) return null; subject.deleted_at = null; return { ...subject }; }),
    getRelations: vi.fn<SubjectRepository["getRelations"]>(async (id) => relations.get(id) ?? { prerequisiteIds: [], unlockIds: [] }),
    replaceRelations: vi.fn<SubjectRepository["replaceRelations"]>(async ({ subjectId: id, prerequisiteIds, unlockIds }) => { const result = { prerequisiteIds, unlockIds }; relations.set(id, result); return result; }),
    activeIds: vi.fn<SubjectRepository["activeIds"]>(async (ids) => new Set(ids.filter((id) => subjects.has(id) && !subjects.get(id)!.deleted_at)))
  } satisfies SubjectRepository;
  const enrollmentRepository = {
    list: vi.fn<EnrollmentRepository["list"]>(async (term) => [...enrollments.values()].filter((item) => !term || item.term_id === term).map((item) => ({ ...item }))),
    create: vi.fn<EnrollmentRepository["create"]>(async (input) => { const row = { id: crypto.randomUUID(), ...input, color: input.color ?? null, notes: input.notes ?? null, schedule: (input.schedule ?? []).map((slot) => ({ ...slot, location: slot.location ?? null })) }; enrollments.set(row.id, row); return row; }),
    update: vi.fn<EnrollmentRepository["update"]>(async (id, patch) => { const current = enrollments.get(id); if (!current) return null; const row = { ...current, ...patch, schedule: patch.schedule?.map((slot) => ({ ...slot, location: slot.location ?? null })) ?? current.schedule }; enrollments.set(id, row); return row; }),
    delete: vi.fn<EnrollmentRepository["delete"]>(async (id) => { enrollments.delete(id); })
  } satisfies EnrollmentRepository;
  const eventRepository = {
    list: vi.fn<EventRepository["list"]>(async (filters) => [...events.values()].filter((item) => !filters.enrollmentId || item.enrollment_id === filters.enrollmentId)),
    getDates: vi.fn<EventRepository["getDates"]>(async (id) => ({ ...events.get(id)! })),
    create: vi.fn<EventRepository["create"]>(async (input) => { const row = { id: crypto.randomUUID(), ...input, title: input.title ?? null, description: input.description ?? null, ends_at: input.ends_at ?? null, status: input.status ?? null, grade: input.grade ?? null, attempt: input.attempt ?? null, links: input.links ?? [] }; events.set(row.id, row); return row; }),
    update: vi.fn<EventRepository["update"]>(async (id, patch) => { const row = { ...events.get(id)!, ...patch }; events.set(id, row); return row; }),
    delete: vi.fn<EventRepository["delete"]>(async (id) => { events.delete(id); })
  } satisfies EventRepository;
  return { terms, subjects, enrollments, events, relations, termRepository, subjectRepository, enrollmentRepository, eventRepository, service: createAcademicService({ terms: termRepository, subjects: subjectRepository, enrollments: enrollmentRepository, events: eventRepository }) };
};
