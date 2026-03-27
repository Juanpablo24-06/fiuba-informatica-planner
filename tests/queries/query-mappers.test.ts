import { describe, expect, it } from "vitest";
import { mapEnrollmentRow, mapEventRow } from "@/lib/query-mappers";
import type { Subject, Term } from "@/lib/types";

const baseSubject = (overrides: Partial<Subject> = {}): Subject => ({
  id: overrides.id ?? "subject-1",
  code: overrides.code ?? "75.01",
  name: overrides.name ?? "Algoritmos",
  credits: overrides.credits ?? 6,
  weekly_hours: overrides.weekly_hours ?? 6,
  total_hours: overrides.total_hours ?? 96,
  term_suggested: overrides.term_suggested ?? 3,
  cycle: overrides.cycle ?? "grado",
  type: overrides.type ?? "obligatoria",
  requirements: overrides.requirements ?? null,
  template: overrides.template ?? null
});

const baseTerm = (overrides: Partial<Term> = {}): Term => ({
  id: overrides.id ?? "term-1",
  label: overrides.label ?? "2026-1",
  start_date: overrides.start_date ?? "2026-03-01",
  end_date: overrides.end_date ?? "2026-07-01",
  is_current: overrides.is_current ?? true
});

describe("query mappers", () => {
  it("maps enrollments and falls back to an empty schedule when the column is unavailable", () => {
    const enrollment = mapEnrollmentRow({
      row: {
        id: "enrollment-1",
        term_id: "term-1",
        subject_id: "subject-1",
        status: "cursando",
        color: "#abcdef",
        notes: "Notas",
        schedule: null,
        subject: baseSubject(),
        term: baseTerm()
      },
      hasSchedule: false
    });

    expect(enrollment).toMatchObject({
      id: "enrollment-1",
      term_id: "term-1",
      subject_id: "subject-1",
      status: "cursando",
      color: "#abcdef",
      notes: "Notas",
      schedule: [],
      term: baseTerm()
    });
  });

  it("maps events without forcing a term in the nested enrollment", () => {
    const event = mapEventRow({
      row: {
        id: "event-1",
        enrollment_id: "enrollment-1",
        type: "parcial",
        title: "Parcial 1",
        description: null,
        starts_at: "2026-04-10T18:00:00.000Z",
        ends_at: null,
        status: null,
        grade: null,
        attempt: 1,
        links: [{ label: "Guía", url: "https://example.com/guide" }],
        enrollment: {
          id: "enrollment-1",
          term_id: "term-1",
          subject_id: "subject-1",
          status: "cursando",
          color: null,
          notes: null,
          schedule: [{ day: "lun", start_time: "10:00", end_time: "12:00", location: null }],
          subject: baseSubject(),
          term: baseTerm()
        }
      },
      hasSchedule: true
    });

    expect(event).toMatchObject({
      id: "event-1",
      enrollment_id: "enrollment-1",
      type: "parcial",
      links: [{ label: "Guía", url: "https://example.com/guide" }],
      enrollment: {
        id: "enrollment-1",
        term: null,
        schedule: [{ day: "lun", start_time: "10:00", end_time: "12:00", location: null }]
      }
    });
  });

  it("includes the nested term only when a query needs it", () => {
    const event = mapEventRow({
      row: {
        id: "event-2",
        enrollment_id: "enrollment-2",
        type: "tp",
        title: null,
        description: "Entrega",
        starts_at: "2026-05-01T10:00:00.000Z",
        ends_at: "2026-05-01T12:00:00.000Z",
        status: "pendiente",
        grade: null,
        attempt: null,
        links: null,
        enrollment: {
          id: "enrollment-2",
          term_id: "term-1",
          subject_id: "subject-1",
          status: "cursando",
          color: "#123456",
          notes: null,
          schedule: [],
          subject: baseSubject(),
          term: baseTerm()
        }
      },
      hasSchedule: true,
      includeTerm: true
    });

    expect(event.enrollment?.term).toEqual(baseTerm());
  });
});
