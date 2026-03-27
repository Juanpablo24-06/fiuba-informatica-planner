import type { Subject } from "@/lib/types";

export const OFFICIAL_CBC_CREDITS = 38;
export const OFFICIAL_OBLIGATORY_CREDITS = 152;
export const OFFICIAL_ELECTIVE_CREDITS = 24;
export const OFFICIAL_TIF_CREDITS = 12;
export const OFFICIAL_TOTAL_CREDITS = 226;

const GENERIC_ELECTIVE_NAMES = new Set(["Electivas/Optativas I", "Electivas/Optativas II"]);

type SubjectStatus = {
  status: string;
  color: string | null;
  termLabel?: string | null;
};

const isCbcSubject = (subject: Pick<Subject, "type" | "cycle">) => {
  const type = subject.type?.toLowerCase();
  const cycle = subject.cycle?.toLowerCase();
  return type === "cbc" || cycle === "cbc";
};

const isGenericElectiveSubject = (subject: Pick<Subject, "name">) =>
  GENERIC_ELECTIVE_NAMES.has(subject.name);

const isFinalProjectStage = (subject: Pick<Subject, "name">) =>
  /Trabajo Integrador Final|Tesis\/Trabajo Profesional/i.test(subject.name);

const getSubjectCredits = (subject: Pick<Subject, "credits" | "weekly_hours">) =>
  subject.credits ?? subject.weekly_hours ?? 0;

export const buildProgressSnapshot = (
  subjects: Subject[],
  latestStatusMap: Map<string, SubjectStatus>
) => {
  const requiredSubjects = subjects.filter(
    (subject) => (subject.type ?? "").toLowerCase() !== "electiva"
  );
  const cbcSubjects = requiredSubjects.filter((subject) => isCbcSubject(subject));
  const obligatorySubjects = requiredSubjects.filter(
    (subject) => !isCbcSubject(subject) && !isFinalProjectStage(subject)
  );
  const finalProjectStages = requiredSubjects.filter((subject) => isFinalProjectStage(subject));
  const electives = subjects.filter(
    (subject) =>
      (subject.type ?? "").toLowerCase() === "electiva" && !isGenericElectiveSubject(subject)
  );

  const approvedCbcSubjects = cbcSubjects.filter(
    (subject) => latestStatusMap.get(subject.id)?.status === "aprobado"
  );
  const approvedCbcCredits = approvedCbcSubjects.reduce(
    (sum, subject) => sum + getSubjectCredits(subject),
    0
  );

  const approvedObligatorySubjects = obligatorySubjects.filter(
    (subject) => latestStatusMap.get(subject.id)?.status === "aprobado"
  );
  const approvedObligatoryCredits = approvedObligatorySubjects.reduce(
    (sum, subject) => sum + getSubjectCredits(subject),
    0
  );

  const approvedElectiveSubjects = electives.filter(
    (subject) => latestStatusMap.get(subject.id)?.status === "aprobado"
  );
  const approvedElectiveCredits = Math.min(
    OFFICIAL_ELECTIVE_CREDITS,
    approvedElectiveSubjects.reduce((sum, subject) => sum + getSubjectCredits(subject), 0)
  );

  const approvedTifCredits = finalProjectStages
    .filter((subject) => latestStatusMap.get(subject.id)?.status === "aprobado")
    .reduce((sum, subject) => sum + getSubjectCredits(subject), 0);

  const approvedTotalCredits = Math.min(
    OFFICIAL_TOTAL_CREDITS,
    approvedCbcCredits + approvedObligatoryCredits + approvedElectiveCredits + approvedTifCredits
  );

  return {
    approvedTotalCredits,
    progressPct: Math.round((approvedTotalCredits / OFFICIAL_TOTAL_CREDITS) * 100),
    approvedCbcCredits,
    totalCbcCredits: OFFICIAL_CBC_CREDITS,
    approvedCbcCourses: approvedCbcSubjects.length,
    totalCbcCourses: cbcSubjects.length,
    approvedObligatoryCredits,
    totalObligatoryCredits: OFFICIAL_OBLIGATORY_CREDITS,
    approvedObligatoryCourses: approvedObligatorySubjects.length,
    totalObligatoryCourses: obligatorySubjects.length,
    approvedElectiveCredits,
    totalElectiveCredits: OFFICIAL_ELECTIVE_CREDITS,
    approvedTifCredits,
    totalTifCredits: OFFICIAL_TIF_CREDITS
  };
};

export type ProgressSnapshot = ReturnType<typeof buildProgressSnapshot>;
