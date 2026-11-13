import { CBC_TERM_LABEL, buildBootstrapSummary, type BootstrapStatus, type CbcSubject } from "../domain/bootstrap-cbc";

export interface CbcRepository {
  findTerm(): Promise<{ id: string } | null>;
  listSubjects(): Promise<CbcSubject[]>;
  listEnrollments(termId: string, subjectIds: string[]): Promise<{ subject_id: string; status: string }[]>;
  createTerm(): Promise<{ id: string }>;
  approveEnrollments(termId: string, subjectIds: string[]): Promise<number>;
  insertEnrollments(termId: string, subjectIds: string[]): Promise<void>;
}

export const createCbcService = (repository: CbcRepository) => {
  const getBootstrapStatus = async (): Promise<BootstrapStatus> => {
    const term = await repository.findTerm();
    const subjects = await repository.listSubjects();
    const enrollments = term && subjects.length ? await repository.listEnrollments(term.id, subjects.map((subject) => subject.id)) : [];
    const approved = enrollments.filter((item) => item.status === "aprobado").length;
    return { loaded: subjects.length > 0 && approved === subjects.length, term: CBC_TERM_LABEL, term_id: term?.id ?? null, approved, total: subjects.length, missing: Math.max(0, subjects.length - approved), subjects };
  };
  const bootstrapCbc = async () => {
    const status = await getBootstrapStatus();
    if (!status.subjects.length) return { ok: true, created: 0, updated: 0, skipped: 0, term: CBC_TERM_LABEL, message: "No se encontraron materias CBC en la base." };
    const termId = status.term_id ?? (await repository.createTerm()).id;
    const ids = status.subjects.map((subject) => subject.id);
    const existing = await repository.listEnrollments(termId, ids);
    const existingIds = new Set(existing.map((item) => item.subject_id));
    const missingIds = ids.filter((id) => !existingIds.has(id));
    const updated = await repository.approveEnrollments(termId, ids);
    if (missingIds.length) await repository.insertEnrollments(termId, missingIds);
    const fresh = await getBootstrapStatus();
    return { ok: true, created: missingIds.length, updated, skipped: Math.max(0, ids.length - missingIds.length - updated), loaded: fresh.loaded, approved: fresh.approved, total: fresh.total, term: CBC_TERM_LABEL, message: buildBootstrapSummary(fresh) };
  };
  return { getBootstrapStatus, bootstrapCbc };
};
