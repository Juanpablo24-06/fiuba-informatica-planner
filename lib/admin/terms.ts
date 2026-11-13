export * from "@/modules/academic/domain/terms";
import { academicService } from "@/modules/academic/server";
export const { listTerms, createTerm, updateTerm, deleteTerm } = academicService;
