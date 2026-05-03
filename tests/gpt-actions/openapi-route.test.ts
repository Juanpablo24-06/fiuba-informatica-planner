import { describe, expect, it } from "vitest";

describe("custom gpt actions openapi route", () => {
  it("serves a hosted OpenAPI document with all action endpoints", async () => {
    const { GET } = await import("@/app/api/openapi/route");
    const response = await GET(new Request("https://example.com/api/openapi"));
    const spec = await response.json();

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("FIUBA Informatica Custom GPT Actions");
    expect(spec.servers).toEqual([{ url: "https://example.com" }]);
    expect(spec.paths).toEqual(
      expect.objectContaining({
        "/api/gpt-actions/terms": expect.any(Object),
        "/api/gpt-actions/terms/{id}": expect.any(Object),
        "/api/gpt-actions/subjects": expect.any(Object),
        "/api/gpt-actions/subjects/{id}": expect.any(Object),
        "/api/gpt-actions/enrollments": expect.any(Object),
        "/api/gpt-actions/enrollments/{id}": expect.any(Object),
        "/api/gpt-actions/events": expect.any(Object),
        "/api/gpt-actions/events/{id}": expect.any(Object),
        "/api/gpt-actions/admin/snapshot": expect.any(Object),
        "/api/gpt-actions/admin/bootstrap-cbc": expect.any(Object)
      })
    );
  });
});
