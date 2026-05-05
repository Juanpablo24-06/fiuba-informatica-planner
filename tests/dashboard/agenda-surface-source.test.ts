import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("agenda surface source", () => {
  const upcomingEventsSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/upcoming-events.tsx"),
    "utf8"
  );
  const monthlyScheduleSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/monthly-schedule.tsx"),
    "utf8"
  );

  it("renders evaluation sections as a flat list with light separators", () => {
    expect(upcomingEventsSource).toContain('border-t border-border/30');
    expect(upcomingEventsSource).toContain('divide-y divide-border/35');
    expect(upcomingEventsSource).toContain('sm:grid-cols-[minmax(0,1fr)_auto]');
  });

  it("keeps the mobile month agenda compact without heavy cards", () => {
    expect(monthlyScheduleSource).toContain('border-t border-border/35 pt-3');
    expect(monthlyScheduleSource).toContain('divide-y divide-border/30');
    expect(monthlyScheduleSource).toContain('rounded-xl border border-border/35 bg-surface/55');
  });

  it("keeps the desktop month calendar readable and scrollable", () => {
    expect(monthlyScheduleSource).toContain("overflow-x-auto");
    expect(monthlyScheduleSource).toContain("min-w-[840px]");
    expect(monthlyScheduleSource).toContain('rounded-xl border border-border/35 bg-surface/55 p-2');
  });
});
