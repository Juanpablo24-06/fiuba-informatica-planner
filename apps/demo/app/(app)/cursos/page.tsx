import CoursesExplorer from "@/components/dashboard/courses-explorer";
import { getSession } from "@/lib/auth";
import { buildCourseCatalog } from "@/lib/courses/catalog";
import {
  getCurrentTerm,
  getDeletedSubjects,
  getEnrollmentsForTerm,
  getEventsForTerm,
  getLatestEnrollmentStatus,
  getPrerequisites,
  getSubjects
} from "@/lib/queries";

export default async function CursosPage() {
  const session = await getSession();
  const [subjects, prerequisites, statusMap, currentTerm] = await Promise.all([
    getSubjects(),
    getPrerequisites(),
    getLatestEnrollmentStatus(),
    getCurrentTerm()
  ]);
  const deletedSubjects = session?.role === "admin" ? await getDeletedSubjects() : [];

  const [enrollments, events] = currentTerm
    ? await Promise.all([
        getEnrollmentsForTerm(currentTerm.id),
        getEventsForTerm(currentTerm.id)
      ])
    : [[], []];

  const courses = buildCourseCatalog({
    subjects,
    prerequisites,
    statusMap,
    currentEnrollments: enrollments,
    events
  });

  return <CoursesExplorer initialCourses={courses} initialDeletedCourses={deletedSubjects} isAdmin={session?.role === "admin"} />;
}
