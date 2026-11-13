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

  it.each(["invalid", "2026-02-30T12:00:00Z", "2026-04-10T19:00:00"])(
    "rejects invalid or ambiguous timestamps: %s", (starts_at) => {
      expect(eventCreateSchema.safeParse({
        enrollment_id: "123e4567-e89b-12d3-a456-426614174000",
        type: "parcial", starts_at
      }).success).toBe(false);
    }
  );

  it("compares instants across offsets and rejects non-positive ranges", () => {
    expect(eventUpdateSchema.safeParse({
      starts_at: "2026-04-10T19:00:00-03:00",
      ends_at: "2026-04-10T21:00:00Z"
    }).success).toBe(false);
    expect(eventUpdateSchema.safeParse({
      starts_at: "2026-04-10T19:00:00-03:00",
      ends_at: "2026-04-10T22:00:00Z"
    }).success).toBe(false);
    expect(eventUpdateSchema.safeParse({
      starts_at: "2026-04-10T19:00:00-03:00",
      ends_at: "2026-04-10T23:00:00Z"
    }).success).toBe(true);
    expect(eventUpdateSchema.safeParse({ ends_at: "invalid" }).success).toBe(false);
    expect(eventUpdateSchema.parse({ ends_at: null })).toEqual({ ends_at: null });
  });
});
