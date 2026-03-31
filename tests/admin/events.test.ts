import { describe, expect, it } from "vitest";
import { eventCreateSchema, eventUpdateSchema } from "@/lib/admin/events";

describe("admin events service contract", () => {
  it("accepts event creation payloads", () => {
    expect(
      eventCreateSchema.parse({
        enrollment_id: "123e4567-e89b-12d3-a456-426614174000",
        type: "parcial",
        title: "Primer parcial",
        starts_at: "2026-04-10T19:00:00.000Z",
        ends_at: "2026-04-10T21:00:00.000Z",
        status: "pendiente",
        links: [{ label: "Enunciado", url: "https://example.com/parcial" }]
      })
    ).toMatchObject({
      type: "parcial",
      title: "Primer parcial"
    });
  });

  it("accepts partial event updates", () => {
    expect(
      eventUpdateSchema.parse({
        status: "aprobado",
        grade: 8
      })
    ).toMatchObject({
      status: "aprobado",
      grade: 8
    });
  });
});
