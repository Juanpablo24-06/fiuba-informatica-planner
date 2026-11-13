export * from "@/modules/academic/domain/enrollments";
import { academicService } from "@/modules/academic/server";
export const { listEnrollments, createEnrollment, updateEnrollment, deleteEnrollment } = academicService;
