import "server-only";
import { createAcademicService } from "./application/service";
import { termRepository } from "./adapters/supabase-terms";
import { subjectRepository } from "./adapters/supabase-subjects";
import { enrollmentRepository } from "./adapters/supabase-enrollments";
import { eventRepository } from "./adapters/supabase-events";
import { cbcRepository } from "./adapters/supabase-cbc";
import { createCbcService } from "./application/bootstrap-cbc";

// Composition is lazy: importing this module never opens a database connection.
export const academicService = createAcademicService({
  terms: termRepository,
  subjects: subjectRepository,
  enrollments: enrollmentRepository,
  events: eventRepository
});
export const cbcService = createCbcService(cbcRepository);
