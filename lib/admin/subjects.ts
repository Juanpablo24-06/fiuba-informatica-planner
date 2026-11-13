export * from "@/modules/academic/domain/subjects";
export { SUBJECT_SELECT_FIELDS } from "@/modules/academic/adapters/supabase-subjects";
import { academicService } from "@/modules/academic/server";
export const { listSubjects, listDeletedSubjects, createSubject, updateSubject, deleteSubject, restoreSubject, getSubjectRelations, replaceSubjectRelations, replaceSubjectPrerequisites } = academicService;
