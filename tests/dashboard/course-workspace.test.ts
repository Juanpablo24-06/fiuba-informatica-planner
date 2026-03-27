import { describe, expect, it } from "vitest";
import type { Enrollment, Event } from "@/lib/types";
import {
  EMPTY_EVENT_FORM,
  buildDescription,
  buildEventForm,
  buildEventPayload,
  draftBlocksToSlots,
  slotsToDraftBlocks,
  validateScheduleBlocks
} from "@/lib/dashboard/course-workspace";

const enrollment: Enrollment = {
  id: "enr-1",
  term_id: "term-1",
  subject_id: "sub-1",
  status: "cursando",
  color: "#123456",
  notes: null,
  schedule: [],
  term: {
    id: "term-1",
    label: "2026 1C",
    start_date: "2026-03-01",
    end_date: "2026-07-01",
    is_current: true
  },
  subject: {
    id: "sub-1",
    code: "75.01",
    name: "Algoritmos I",
    credits: 8,
    weekly_hours: 6,
    total_hours: 96,
    term_suggested: 3,
    cycle: "tronco",
    type: "obligatoria",
    requirements: ["Regularizar laboratorio", "Tener parciales aprobados"],
    template: {
      parciales: 2,
      tps: 4,
      promocion: true,
      notas: "Llevar apuntes al día."
    }
  }
};

const event: Event = {
  id: "evt-1",
  enrollment_id: "enr-1",
  type: "parcial",
  title: "Parcial 1",
  description: "Capítulos 1 a 3",
  starts_at: "2026-04-10T17:00:00.000Z",
  ends_at: "2026-04-10T19:00:00.000Z",
  status: "pendiente",
  grade: 8,
  attempt: 1,
  links: [
    { label: "Aula", url: "https://campus.example/aula" },
    { label: "Enunciado viejo", url: "https://campus.example/viejo" }
  ]
};

describe("course workspace helpers", () => {
  it("groups matching schedule slots into draft blocks", () => {
    const blocks = slotsToDraftBlocks([
      { day: "mar", start_time: "10:00", end_time: "12:00", location: "Aula 1" },
      { day: "lun", start_time: "10:00", end_time: "12:00", location: "Aula 1" },
      { day: "vie", start_time: "08:00", end_time: "10:00", location: null }
    ]);

    expect(blocks).toEqual([
      {
        days: ["vie"],
        start_time: "08:00",
        end_time: "10:00",
        location: null
      },
      {
        days: ["lun", "mar"],
        start_time: "10:00",
        end_time: "12:00",
        location: "Aula 1"
      }
    ]);
  });

  it("expands draft blocks back into normalized schedule slots", () => {
    expect(
      draftBlocksToSlots([
        {
          days: ["mar", "lun"],
          start_time: "10:00",
          end_time: "12:00",
          location: " Aula 1 "
        }
      ])
    ).toEqual([
      { day: "lun", start_time: "10:00", end_time: "12:00", location: "Aula 1" },
      { day: "mar", start_time: "10:00", end_time: "12:00", location: "Aula 1" }
    ]);
  });

  it("validates malformed schedule blocks", () => {
    expect(
      validateScheduleBlocks([
        {
          days: [],
          start_time: "12:00",
          end_time: "10:00",
          location: null
        }
      ])
    ).toBe("Revisá el horario: cada bloque debe tener hora inicio menor a hora fin.");
    expect(
      validateScheduleBlocks([
        {
          days: ["lun"],
          start_time: "10:00",
          end_time: "12:00",
          location: null
        }
      ])
    ).toBeNull();
  });

  it("builds a rich description from enrollment metadata", () => {
    const description = buildDescription(enrollment);

    expect(description).toContain("Llevar apuntes al día.");
    expect(description).toContain("Requisitos generales: Regularizar laboratorio · Tener parciales aprobados.");
    expect(description).toContain("Datos de cátedra: 8 créditos · 6 h semanales · 96 h totales · sugerida en cuatrimestre 3.");
    expect(description).toContain("Plantilla de evaluación:");
  });

  it("builds event forms and payloads while preserving secondary links", () => {
    const form = buildEventForm(event, { label: "Campus", url: "https://campus.example/nuevo" });

    expect(form).toMatchObject({
      type: "parcial",
      title: "Parcial 1",
      description: "Capítulos 1 a 3",
      grade: "8",
      status: "pendiente",
      attempt: "1",
      linkLabel: "Campus",
      linkUrl: "https://campus.example/nuevo"
    });

    expect(
      buildEventPayload({
        enrollmentId: "enr-1",
        form: {
          ...EMPTY_EVENT_FORM,
          type: "final",
          title: " Final integrador ",
          description: " Temas 1 al 5 ",
          starts_at: "2026-05-20T18:30",
          ends_at: "2026-05-20T20:00",
          grade: "9",
          status: "aprobado",
          attempt: "2",
          linkLabel: " Aula virtual ",
          linkUrl: " https://campus.example/final "
        },
        existingLinks: event.links
      })
    ).toEqual({
      enrollment_id: "enr-1",
      type: "final",
      title: "Final integrador",
      description: "Temas 1 al 5",
      starts_at: new Date("2026-05-20T18:30").toISOString(),
      ends_at: new Date("2026-05-20T20:00").toISOString(),
      grade: 9,
      status: "aprobado",
      attempt: 2,
      links: [
        { label: "Aula virtual", url: "https://campus.example/final" },
        { label: "Enunciado viejo", url: "https://campus.example/viejo" }
      ]
    });
  });
});
