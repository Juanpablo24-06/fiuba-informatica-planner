import { subjectCreateSchema, subjectPrerequisitesSchema, subjectUpdateSchema } from "../domain/subjects";
import { AcademicValidationError, parseAcademicInput } from "../domain/errors";
import type { SubjectCreateInput, SubjectRepository, SubjectUpdateInput, SubjectRelations } from "./ports";

export const createSubjectService = (repository: SubjectRepository) => ({
  listSubjects: (options?: { includeDeleted?: boolean }) => repository.list(options),
  listDeletedSubjects: () => repository.listDeleted(),
  createSubject: async (input: SubjectCreateInput) => repository.create(parseAcademicInput(subjectCreateSchema, input)),
  updateSubject: async (id: string, input: SubjectUpdateInput) => {
    const parsed = parseAcademicInput(subjectUpdateSchema, input);
    if (Object.keys(parsed).length === 0) throw new AcademicValidationError("No hay cambios para guardar.");
    return repository.update(id, parsed);
  },
  deleteSubject: (id: string) => repository.delete(id),
  restoreSubject: (id: string) => repository.restore(id),
  getSubjectRelations: (id: string) => repository.getRelations(id),
  replaceSubjectRelations: async (input: { subjectId: string } & SubjectRelations) => {
    const parsed = parseAcademicInput(subjectPrerequisitesSchema, input);
    return repository.replaceRelations({ subjectId: input.subjectId, prerequisiteIds: [...new Set(parsed.prerequisiteIds)], unlockIds: [...new Set(parsed.unlockIds ?? [])] });
  },
  replaceSubjectPrerequisites: async (subjectId: string, prerequisiteIds: string[]) => {
    const current = await repository.getRelations(subjectId);
    const active = await repository.activeIds(prerequisiteIds);
    return repository.replaceRelations({ subjectId, prerequisiteIds: [...new Set(prerequisiteIds.filter((id) => active.has(id)))], unlockIds: current.unlockIds });
  }
});
