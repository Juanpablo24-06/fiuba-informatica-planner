import { enrollmentCreateSchema, enrollmentUpdateSchema, type EnrollmentCreateInput, type EnrollmentUpdateInput } from "../domain/enrollments";
import { AcademicValidationError, parseAcademicInput } from "../domain/errors";
import type { EnrollmentRepository } from "./ports";

export const createEnrollmentService = (repository: EnrollmentRepository) => ({
  listEnrollments: (termId?: string | null) => repository.list(termId),
  createEnrollment: async (input: EnrollmentCreateInput) => repository.create(parseAcademicInput(enrollmentCreateSchema, input)),
  updateEnrollment: async (id: string, patch: EnrollmentUpdateInput) => {
    const parsed = parseAcademicInput(enrollmentUpdateSchema, patch);
    if (Object.keys(parsed).length === 0) throw new AcademicValidationError("No hay cambios para guardar.");
    return repository.update(id, parsed);
  },
  deleteEnrollment: (id: string) => repository.delete(id)
});
