import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: supabase }));

const subjectId = "11111111-1111-4111-8111-111111111111";
const activeId = "22222222-2222-4222-8222-222222222222";
const archivedId = "33333333-3333-4333-8333-333333333333";

const setupReadMocks = () => {
  supabase.from.mockImplementation((table: string) => {
    if (table === "subject_prerequisites") {
      return {
        select: () => ({
          or: async () => ({
            data: [
              { subject_id: subjectId, prerequisite_id: activeId },
              { subject_id: subjectId, prerequisite_id: archivedId },
              { subject_id: archivedId, prerequisite_id: subjectId }
            ],
            error: null
          })
        })
      };
    }
    return {
      select: () => ({
        in: () => ({
          is: async () => ({ data: [{ id: activeId }], error: null })
        })
      })
    };
  });
};

describe("subject relation archival compatibility", () => {
  it("ships the migration rule that preserves archived counterpart edges", () => {
    const migration = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/008_editable_curriculum_subjects.sql"),
      "utf8"
    );
    expect(migration).toContain("counterpart.deleted_at is null");
    expect(migration).toContain("join subjects as counterpart");
  });

  it("hides archived counterparts while retaining active edges in the service response", async () => {
    setupReadMocks();
    const { getSubjectRelations } = await import("@/lib/admin/subjects");

    await expect(getSubjectRelations(subjectId)).resolves.toEqual({
      prerequisiteIds: [activeId],
      unlockIds: []
    });
  });

  it("filters hidden archived IDs from the legacy prerequisite wrapper", async () => {
    setupReadMocks();
    supabase.rpc.mockResolvedValue({
      data: [{ subject_id: subjectId, prerequisite_id: activeId }],
      error: null
    });
    const { replaceSubjectPrerequisites } = await import("@/lib/admin/subjects");

    await replaceSubjectPrerequisites(subjectId, [activeId, archivedId]);
    expect(supabase.rpc).toHaveBeenCalledWith("replace_subject_relations", {
      p_subject_id: subjectId,
      p_prerequisite_ids: [activeId],
      p_unlock_ids: []
    });
  });
});
