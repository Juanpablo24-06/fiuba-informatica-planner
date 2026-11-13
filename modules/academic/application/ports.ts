import type { z } from "zod";
import type { Enrollment, Event, Subject, Term } from "../domain/types";
import type { termCreateSchema, termUpdateSchema } from "../domain/terms";
import type { subjectCreateSchema, subjectUpdateSchema } from "../domain/subjects";
import type { EnrollmentCreateInput, EnrollmentUpdateInput } from "../domain/enrollments";
import type { EventCreateInput, EventUpdateInput } from "../domain/events";

export type TermCreateInput = z.infer<typeof termCreateSchema>;
export type TermUpdateInput = z.infer<typeof termUpdateSchema>;
export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;
export type SubjectRelations = { prerequisiteIds: string[]; unlockIds: string[] };

export interface TermRepository {
  list(): Promise<Term[]>;
  getDates(id: string): Promise<Pick<Term, "start_date" | "end_date"> | null>;
  clearCurrent(exceptId?: string): Promise<void>;
  create(input: TermCreateInput): Promise<Term | null>;
  update(id: string, input: TermUpdateInput): Promise<Term | null>;
  delete(id: string): Promise<void>;
}

export interface SubjectRepository {
  list(options?: { includeDeleted?: boolean }): Promise<Subject[]>;
  listDeleted(): Promise<Subject[]>;
  create(input: SubjectCreateInput): Promise<Subject>;
  update(id: string, input: SubjectUpdateInput): Promise<Subject>;
  delete(id: string): Promise<Subject | null>;
  restore(id: string): Promise<Subject | null>;
  getRelations(id: string): Promise<SubjectRelations>;
  replaceRelations(input: { subjectId: string } & SubjectRelations): Promise<SubjectRelations>;
  activeIds(ids: string[]): Promise<Set<string>>;
}

// Relation expansion is optional for write responses; the HTTP shape stays intact.
export type EnrollmentRecord = Omit<Enrollment, "subject" | "term"> & {
  subject?: Subject;
  term?: Term | null;
};
export interface EnrollmentRepository {
  list(termId?: string | null): Promise<EnrollmentRecord[]>;
  create(input: EnrollmentCreateInput): Promise<EnrollmentRecord | null>;
  update(id: string, input: EnrollmentUpdateInput): Promise<EnrollmentRecord | null>;
  delete(id: string): Promise<void>;
}

export type EventFilters = { termId?: string | null; enrollmentId?: string | null };
export interface EventRepository {
  list(filters: EventFilters): Promise<Event[]>;
  getDates(id: string): Promise<Pick<Event, "starts_at" | "ends_at">>;
  create(input: EventCreateInput): Promise<Event>;
  update(id: string, input: EventUpdateInput): Promise<Event>;
  delete(id: string): Promise<void>;
}
