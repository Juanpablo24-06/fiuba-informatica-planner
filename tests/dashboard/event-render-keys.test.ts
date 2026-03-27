import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard event render keys", () => {
  const weeklyScheduleSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/weekly-schedule.tsx"),
    "utf8"
  );
  const monthlyScheduleSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/monthly-schedule.tsx"),
    "utf8"
  );
  const upcomingEventsSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/upcoming-events.tsx"),
    "utf8"
  );

  it("does not rely on raw event ids alone for schedule render keys", () => {
    expect(weeklyScheduleSource).not.toContain("key={event.id}");
    expect(monthlyScheduleSource).not.toContain("key={event.id}");
    expect(upcomingEventsSource).not.toContain("key={event.id}");
  });

  it("avoids raw tag strings as duplicate-prone keys", () => {
    expect(weeklyScheduleSource).not.toContain("key={tag}");
    expect(upcomingEventsSource).not.toContain("key={tag}");
  });
});
