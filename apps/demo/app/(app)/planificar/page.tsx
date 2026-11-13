import PlannerWorkspace from "@/components/planner/planner-workspace";
import { getSession } from "@/lib/auth";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getLatestEnrollmentStatus, getPrerequisites, getSubjects, getTerms } from "@/lib/queries";
import { buildPlannerSubjectOptions } from "@/lib/planner/academic-status";

export default async function PlanificarPage({ searchParams }: { searchParams: Promise<{ term?: string }> }) {
  const requestedTermId = (await searchParams).term;
  const [session, terms, currentTerm, subjects, prerequisites, latestStatuses] = await Promise.all([
    getSession(),
    getTerms(),
    getCurrentTerm(),
    getSubjects(),
    getPrerequisites(),
    getLatestEnrollmentStatus()
  ]);
  const term = terms.find((item) => item.id === requestedTermId) ?? currentTerm;
  const [enrollments, events] = term
    ? await Promise.all([getEnrollmentsForTerm(term.id), getEventsForTerm(term.id)])
    : [[], []];

  const subjectOptions = buildPlannerSubjectOptions({ subjects, prerequisites, latestStatuses });
  return <PlannerWorkspace term={term} terms={terms} termWasExplicit={Boolean(requestedTermId)} enrollments={enrollments} events={events} subjectOptions={subjectOptions} isAdmin={session?.role === "admin"} mode="planning" />;
}
