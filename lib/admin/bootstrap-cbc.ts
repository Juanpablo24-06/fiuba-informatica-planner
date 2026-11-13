export * from "@/modules/academic/domain/bootstrap-cbc";
import { cbcService } from "@/modules/academic/server";
export const { getBootstrapStatus, bootstrapCbc } = cbcService;
