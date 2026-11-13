import type { z } from "zod";

export class AcademicValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "AcademicValidationError";
  }
}

export const parseAcademicInput = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AcademicValidationError(parsed.error.issues.map((issue) => issue.message).join("; "));
  return parsed.data;
};
