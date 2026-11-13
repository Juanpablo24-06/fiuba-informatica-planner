import { hasValidTermRange, termCreateSchema, termRangeIssue, termUpdateSchema } from "../domain/terms";
import { AcademicValidationError, parseAcademicInput } from "../domain/errors";
import type { TermCreateInput, TermRepository, TermUpdateInput } from "./ports";

export const createTermService = (repository: TermRepository) => ({
  listTerms: () => repository.list(),
  createTerm: async (input: TermCreateInput) => {
    const parsed = parseAcademicInput(termCreateSchema, input);
    if (parsed.is_current) await repository.clearCurrent();
    return repository.create(parsed);
  },
  updateTerm: async (id: string, input: TermUpdateInput) => {
    const parsed = parseAcademicInput(termUpdateSchema, input);
    if (Object.keys(parsed).length === 0) throw new AcademicValidationError("No hay cambios para guardar.");
    if (parsed.is_current || parsed.start_date !== undefined || parsed.end_date !== undefined) {
      const current = await repository.getDates(id);
      if (!current) return null;
      if (!hasValidTermRange({ ...current, ...parsed })) throw new AcademicValidationError(termRangeIssue.message);
    }
    if (parsed.is_current) await repository.clearCurrent(id);
    return repository.update(id, parsed);
  },
  deleteTerm: (id: string) => repository.delete(id)
});
