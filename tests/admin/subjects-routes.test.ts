import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: {
    requireSessionFromRequest: vi.fn(),
    requireRoleFromRequest: vi.fn()
  },
  subjects: {
    listSubjects: vi.fn(),
    listDeletedSubjects: vi.fn(),
    deleteSubject: vi.fn(),
    restoreSubject: vi.fn(),
    getSubjectRelations: vi.fn(),
    replaceSubjectPrerequisites: vi.fn(),
    replaceSubjectRelations: vi.fn()
  }
}));

vi.mock("@/lib/auth", () => mocks.auth);
vi.mock("@/lib/admin/subjects", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/subjects")>(
    "@/lib/admin/subjects"
  );
  return { ...actual, ...mocks.subjects };
});

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

const request = (path: string, init?: NextRequestInit) =>
  new NextRequest(new URL(path, "https://example.com"), init);

describe("subject routes", { timeout: 30_000 }, () => {
  afterEach(() => {
    vi.resetModules();
    for (const group of Object.values(mocks)) {
      for (const mockFn of Object.values(group)) mockFn.mockReset();
    }
  });

  it("separates active catalog and trash reads", async () => {
    mocks.auth.requireSessionFromRequest.mockReturnValue({ role: "admin" });
    mocks.subjects.listSubjects.mockResolvedValue([{ id: "active" }]);
    mocks.subjects.listDeletedSubjects.mockResolvedValue([{ id: "archived" }]);
    const route = await import("@/app/api/subjects/route");

    expect(await (await route.GET(request("/api/subjects"))).json()).toEqual({
      subjects: [{ id: "active" }]
    });
    expect(
      await (await route.GET(request("/api/subjects?trash=true"))).json()
    ).toEqual({ subjects: [{ id: "archived" }] });
    expect(mocks.subjects.listSubjects).toHaveBeenCalledTimes(1);
    expect(mocks.subjects.listDeletedSubjects).toHaveBeenCalledTimes(1);
  });

  it("routes delete and restore through soft-delete services", async () => {
    mocks.auth.requireRoleFromRequest.mockReturnValue({ role: "admin" });
    mocks.subjects.deleteSubject.mockResolvedValue({ id: "subject-1", deleted_at: "now" });
    mocks.subjects.restoreSubject.mockResolvedValue({ id: "subject-1", deleted_at: null });
    const deleteRoute = await import("@/app/api/subjects/[id]/route");
    const restoreRoute = await import("@/app/api/subjects/[id]/restore/route");

    expect(
      await (await deleteRoute.DELETE(request("/api/subjects/subject-1", { method: "DELETE" }), {
        params: Promise.resolve({ id: "subject-1" })
      })).json()
    ).toEqual({ ok: true });
    expect(
      await (await restoreRoute.POST(request("/api/subjects/subject-1/restore", { method: "POST" }), {
        params: Promise.resolve({ id: "subject-1" })
      })).json()
    ).toEqual({ ok: true, subject: { id: "subject-1", deleted_at: null } });
    expect(mocks.subjects.deleteSubject).toHaveBeenCalledWith("subject-1");
    expect(mocks.subjects.restoreSubject).toHaveBeenCalledWith("subject-1");
  });

  it("updates both directions and preserves unlocks for legacy payloads", async () => {
    const prerequisiteId = "11111111-1111-4111-8111-111111111111";
    const unlockId = "22222222-2222-4222-8222-222222222222";
    mocks.auth.requireRoleFromRequest.mockReturnValue({ role: "admin" });
    mocks.subjects.replaceSubjectRelations.mockResolvedValue({
      prerequisiteIds: [prerequisiteId],
      unlockIds: [unlockId]
    });
    mocks.subjects.replaceSubjectPrerequisites.mockResolvedValue({
      prerequisiteIds: [prerequisiteId],
      unlockIds: [unlockId]
    });
    const route = await import("@/app/api/subjects/[id]/prerequisites/route");

    const full = await route.PUT(
      request("/api/subjects/subject-1/prerequisites", {
        method: "PUT",
        body: JSON.stringify({
          prerequisiteIds: [prerequisiteId],
          unlockIds: [unlockId]
        }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "subject-1" }) }
    );
    expect(await full.json()).toEqual({
      prerequisiteIds: [prerequisiteId],
      unlockIds: [unlockId]
    });
    expect(mocks.subjects.replaceSubjectRelations).toHaveBeenCalledWith({
      subjectId: "subject-1",
      prerequisiteIds: [prerequisiteId],
      unlockIds: [unlockId]
    });

    const legacy = await route.PUT(
      request("/api/subjects/subject-1/prerequisites", {
        method: "PUT",
        body: JSON.stringify({ prerequisiteIds: [prerequisiteId] }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "subject-1" }) }
    );
    expect(await legacy.json()).toEqual({
      prerequisiteIds: [prerequisiteId],
      unlockIds: [unlockId]
    });
    expect(mocks.subjects.replaceSubjectPrerequisites).toHaveBeenCalledWith("subject-1", [
      prerequisiteId
    ]);
  });
});
