import { describe, expect, it } from "vitest";
import {
  enrollmentCreateSchema,
  enrollmentUpdateSchema,
  removeScheduleFromEnrollmentInput
} from "@/lib/admin/enrollments";

describe("admin enrollments service contract", () => {
  it("accepts enrollment payloads with schedule slots", () => {
    expect(
      enrollmentCreateSchema.parse({
        term_id: "123e4567-e89b-12d3-a456-426614174000",
        subject_id: "123e4567-e89b-12d3-a456-426614174001",
        status: "cursando",
        color: "#112233",
        notes: "Turno noche",
        schedule: [
          {
            day: "lun",
            start_time: "19:00",
            end_time: "21:00",
            location: "Aula 101"
          }
        ]
      })
    ).toMatchObject({
      status: "cursando"
    });
  });

  it("can strip schedule for fallback writes", () => {
    expect(
      removeScheduleFromEnrollmentInput({
        status: "aprobado",
        schedule: [{ day: "mar", start_time: "10:00", end_time: "12:00", location: null }]
      })
    ).toEqual({
      status: "aprobado"
    });

    expect(
      enrollmentUpdateSchema.parse({
        notes: "Subir acta"
      })
    ).toEqual({
      notes: "Subir acta"
    });
  });
});
