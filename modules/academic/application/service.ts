import { createTermService } from "./terms";
import { createSubjectService } from "./subjects";
import { createEnrollmentService } from "./enrollments";
import { createEventService } from "./events";
import type { TermRepository, SubjectRepository, EnrollmentRepository, EventRepository } from "./ports";

export const createAcademicService = (repositories: {
  terms: TermRepository;
  subjects: SubjectRepository;
  enrollments: EnrollmentRepository;
  events: EventRepository;
}) => ({
  ...createTermService(repositories.terms),
  ...createSubjectService(repositories.subjects),
  ...createEnrollmentService(repositories.enrollments),
  ...createEventService(repositories.events)
});

export type AcademicService = ReturnType<typeof createAcademicService>;
