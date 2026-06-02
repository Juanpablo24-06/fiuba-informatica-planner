import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import {
  getBootstrapStatus
} from "@/lib/admin/bootstrap-cbc";
import { listEnrollments } from "@/lib/admin/enrollments";
import { listEvents } from "@/lib/admin/events";
import { listSubjects } from "@/lib/admin/subjects";
import { listTerms } from "@/lib/admin/terms";
import { requireExternalAdminRequest } from "@/lib/external-admin-auth";

export const jsonError = (status: number, error: string) =>
  NextResponse.json({ ok: false, error }, { status });

export const requireGptActionAuth = (request: NextRequest) =>
  requireExternalAdminRequest(request, {
    tokenEnvNames: ["GPT_ACTIONS_BEARER_TOKEN"]
  });

export const parseJsonBody = async <T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> => {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      response: jsonError(400, "Datos inválidos.")
    };
  }

  return {
    success: true,
    data: parsed.data
  };
};

export const buildAdminSnapshot = async () => {
  const [terms, subjects, bootstrapStatus] = await Promise.all([
    listTerms(),
    listSubjects(),
    getBootstrapStatus()
  ]);

  const currentTerm = terms.find((term) => term.is_current) ?? terms[0] ?? null;
  const currentTermId = currentTerm?.id ?? null;

  const [enrollments, events] = await Promise.all([
    currentTermId ? listEnrollments(currentTermId) : Promise.resolve([]),
    currentTermId ? listEvents({ termId: currentTermId }) : Promise.resolve([])
  ]);

  return {
    current_term: currentTerm,
    counts: {
      terms: terms.length,
      subjects: subjects.length,
      current_term_enrollments: enrollments.length,
      current_term_events: events.length
    },
    terms,
    subjects,
    current_term_enrollments: enrollments,
    current_term_events: events,
    bootstrap_cbc: {
      loaded: bootstrapStatus.loaded,
      approved: bootstrapStatus.approved,
      total: bootstrapStatus.total,
      missing: bootstrapStatus.missing,
      term: bootstrapStatus.term
    }
  };
};
