import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./fixtures";

test("admin validation rejects invalid dates and schedules before writing data", async ({ page }) => {
  await loginAsDemo(page, "/admin");
  const enrollmentId = "123e4567-e89b-12d3-a456-426614174000";

  const invalidEvent = await page.request.post("/api/events", { data: {
    enrollment_id: enrollmentId, type: "parcial", starts_at: "not-a-date"
  } });
  expect(invalidEvent.status()).toBe(400);

  const reversedEvent = await page.request.post("/api/events", { data: {
    enrollment_id: enrollmentId, type: "parcial",
    starts_at: "2026-04-10T19:00:00-03:00", ends_at: "2026-04-10T21:00:00Z"
  } });
  expect(reversedEvent.status()).toBe(400);

  const invalidTerm = await page.request.post("/api/terms", { data: {
    label: "2026-1", start_date: "2026-07-15", end_date: "2026-03-10"
  } });
  expect(invalidTerm.status()).toBe(400);

  const invalidSchedule = await page.request.post("/api/enrollments", { data: {
    term_id: enrollmentId, subject_id: enrollmentId, status: "cursando",
    schedule: [{ day: "lun", start_time: "19:00", end_time: "18:00" }]
  } });
  expect(invalidSchedule.status()).toBe(400);
});
