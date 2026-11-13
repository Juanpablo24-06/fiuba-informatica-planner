import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getSessionFromRequest = vi.fn();
vi.mock("@/lib/auth", () => ({ getSessionFromRequest }));

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];
const request = (path: string, init?: NextRequestInit) => new NextRequest(new URL(`https://example.test${path}`), init);

describe("planner scenario routes", () => {
  beforeEach(() => getSessionFromRequest.mockReset());

  it("keeps scenario reads behind the existing session guard", async () => {
    getSessionFromRequest.mockReturnValue(null);
    const route = await import("@/app/api/planner/scenarios/route");
    const response = await route.GET(request("/api/planner/scenarios?termId=11111111-1111-4111-8111-111111111111"));
    expect(response.status).toBe(401);
  });

  it("rejects malformed scenario creation before touching the store", async () => {
    getSessionFromRequest.mockReturnValue({ role: "viewer" });
    const route = await import("@/app/api/planner/scenarios/route");
    const response = await route.POST(request("/api/planner/scenarios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ termId: "not-a-uuid", name: "" })
    }));
    expect(response.status).toBe(400);
  });

  it("rejects invalid multi-offer payloads at the selection boundary", async () => {
    getSessionFromRequest.mockReturnValue({ role: "viewer" });
    const route = await import("@/app/api/planner/scenarios/[id]/selections/[selectionId]/offers/route");
    const response = await route.PUT(request("/api/planner/scenarios/scenario-1/selections/selection-1/offers", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offerIds: [""] })
    }), { params: Promise.resolve({ id: "scenario-1", selectionId: "selection-1" }) });
    expect(response.status).toBe(400);
  });

  it("allows an authenticated non-admin to reach offer ingestion validation", async () => {
    getSessionFromRequest.mockReturnValue({ role: "viewer" });
    const route = await import("@/app/api/planner/offers/route");
    const response = await route.POST(request("/api/planner/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    }));
    expect(response.status).toBe(400);
  });
});
