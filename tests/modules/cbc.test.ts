import { describe, expect, it } from "vitest";
import { createCbcService, type CbcRepository } from "@/modules/academic/application/bootstrap-cbc";
describe("CBC orchestration without a database", () => {
  it("is idempotent and preserves existing approved enrollments", async () => {
    let term: { id: string } | null = null;
    const statuses = new Map<string, string>([["math", "aprobado"]]);
    const repository: CbcRepository = {
      findTerm: async () => term,
      listSubjects: async () => ["math", "algebra"].map((id) => ({ id, name: id, code: null, cycle: "cbc", type: "cbc" })),
      listEnrollments: async () => [...statuses].map(([subject_id, status]) => ({ subject_id, status })),
      createTerm: async () => (term = { id: "cbc" }),
      approveEnrollments: async () => { let changed = 0; for (const [id, status] of statuses) if (status !== "aprobado") { statuses.set(id, "aprobado"); changed++; } return changed; },
      insertEnrollments: async (_, ids) => { ids.forEach((id) => statuses.set(id, "aprobado")); }
    };
    const service = createCbcService(repository);
    expect(await service.bootstrapCbc()).toMatchObject({ created: 1, loaded: true, approved: 2 });
    expect(await service.bootstrapCbc()).toMatchObject({ created: 0, updated: 0, skipped: 2, loaded: true });
  });
});
