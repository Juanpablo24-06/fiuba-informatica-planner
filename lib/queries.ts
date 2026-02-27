import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Enrollment, Event, Subject, Term } from "@/lib/types";
import {
  ENROLLMENT_FIELDS_NO_SCHEDULE,
  ENROLLMENT_FIELDS_WITH_SCHEDULE,
  EVENT_WITH_ENROLLMENT_NO_SCHEDULE,
  EVENT_WITH_ENROLLMENT_NO_SCHEDULE_AND_TERM,
  EVENT_WITH_ENROLLMENT_SCHEDULE,
  EVENT_WITH_ENROLLMENT_SCHEDULE_AND_TERM,
  isMissingEnrollmentScheduleColumn
} from "@/lib/enrollment-select";

const DAY_MS = 24 * 60 * 60 * 1000;

const asSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

const sortTermLabel = (label?: string | null) => {
  if (!label) return 0;
  const [year, part] = label.split("-");
  const yearNum = Number(year) || 0;
  const partNum = Number(part) || 0;
  return yearNum * 10 + partNum;
};

const sortTermsByRecency = (a: Term, b: Term) => {
  const byLabel = sortTermLabel(b.label) - sortTermLabel(a.label);
  if (byLabel !== 0) return byLabel;
  const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
  const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
  return bDate - aDate;
};

const queryWithScheduleFallback = async <T>({
  withSchedule,
  withoutSchedule
}: {
  withSchedule: () => any;
  withoutSchedule: () => any;
}) => {
  const first = await withSchedule();
  if (!first.error) {
    return { data: first.data ?? [], hasSchedule: true };
  }

  if (!isMissingEnrollmentScheduleColumn(first.error)) {
    throw first.error;
  }

  const second = await withoutSchedule();
  if (second.error) {
    throw second.error;
  }

  return { data: second.data ?? [], hasSchedule: false };
};

export const getTerms = async (): Promise<Term[]> => {
  const { data, error } = await supabaseAdmin
    .from("terms")
    .select("id,label,start_date,end_date,is_current")
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("label", { ascending: false });

  if (error) {
    throw error;
  }
  return (data ?? []) as Term[];
};

export const getCurrentTerm = async (): Promise<Term | null> => {
  const terms = await getTerms();
  const current = terms.filter((term) => term.is_current);
  if (current.length > 0) {
    return [...current].sort(sortTermsByRecency)[0];
  }
  if (terms.length === 0) return null;
  return [...terms].sort(sortTermsByRecency)[0];
};

export const getSubjects = async (): Promise<Subject[]> => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select(
      "id,code,name,credits,weekly_hours,total_hours,term_suggested,cycle,type,requirements,template"
    )
    .order("term_suggested", { ascending: true, nullsFirst: false });

  if (error) {
    throw error;
  }
  return (data ?? []) as Subject[];
};

export const getEnrollmentsForTerm = async (
  termId: string
): Promise<Enrollment[]> => {
  const { data, hasSchedule } = await queryWithScheduleFallback<any>({
    withSchedule: () =>
      supabaseAdmin
        .from("enrollments")
        .select(ENROLLMENT_FIELDS_WITH_SCHEDULE)
        .eq("term_id", termId)
        .order("name", { foreignTable: "subjects", ascending: true }),
    withoutSchedule: () =>
      supabaseAdmin
        .from("enrollments")
        .select(ENROLLMENT_FIELDS_NO_SCHEDULE)
        .eq("term_id", termId)
        .order("name", { foreignTable: "subjects", ascending: true })
  });

  return (data ?? []).map((row: any) => {
    const subject = asSingle<Subject>(row.subject);
    const term = asSingle<Term>(row.term);
    return {
      id: row.id,
      term_id: row.term_id,
      subject_id: row.subject_id,
      status: row.status,
      color: row.color ?? null,
      notes: row.notes ?? null,
      schedule: hasSchedule && Array.isArray(row.schedule) ? row.schedule : [],
      subject: subject as Subject,
      term
    } satisfies Enrollment;
  });
};

type EnrollmentSummary = {
  status: string;
  subject: {
    name: string;
    code: string | null;
  };
};

export const getEnrollmentSummaryByTermIds = async (
  termIds: string[]
): Promise<Map<string, EnrollmentSummary[]>> => {
  const uniqueTermIds = [...new Set(termIds.filter(Boolean))];
  if (uniqueTermIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("term_id,status,subject:subjects(name,code)")
    .in("term_id", uniqueTermIds)
    .order("name", { foreignTable: "subjects", ascending: true });

  if (error) {
    throw error;
  }

  const byTerm = new Map<string, EnrollmentSummary[]>();

  for (const row of data ?? []) {
    const termId = typeof row?.term_id === "string" ? row.term_id : null;
    if (!termId) continue;

    const subjectRaw = asSingle<{ name: string; code: string | null }>(row.subject as any);
    if (!subjectRaw?.name) continue;

    const current = byTerm.get(termId) ?? [];
    current.push({
      status: String(row.status ?? ""),
      subject: {
        name: String(subjectRaw.name),
        code: subjectRaw.code ?? null
      }
    });
    byTerm.set(termId, current);
  }

  return byTerm;
};

export const getEventsForTerm = async (termId: string): Promise<Event[]> => {
  const { data, hasSchedule } = await queryWithScheduleFallback<any>({
    withSchedule: () =>
      supabaseAdmin
        .from("events")
        .select(EVENT_WITH_ENROLLMENT_SCHEDULE)
        .eq("enrollment.term_id", termId)
        .order("starts_at", { ascending: true }),
    withoutSchedule: () =>
      supabaseAdmin
        .from("events")
        .select(EVENT_WITH_ENROLLMENT_NO_SCHEDULE)
        .eq("enrollment.term_id", termId)
        .order("starts_at", { ascending: true })
  });

  return (data ?? []).map((row: any) => {
    const enrollmentRaw = asSingle<any>(row.enrollment);
    const subject = asSingle<Subject>(enrollmentRaw?.subject);
    const enrollment: Enrollment | undefined = enrollmentRaw
      ? {
          id: enrollmentRaw.id,
          term_id: enrollmentRaw.term_id,
          subject_id: enrollmentRaw.subject_id,
          status: enrollmentRaw.status,
          color: enrollmentRaw.color ?? null,
          notes: enrollmentRaw.notes ?? null,
          schedule:
            hasSchedule && Array.isArray(enrollmentRaw.schedule)
              ? enrollmentRaw.schedule
              : [],
          subject: subject as Subject,
          term: null
        }
      : undefined;

    return {
      id: row.id,
      enrollment_id: row.enrollment_id,
      type: row.type,
      title: row.title ?? null,
      description: row.description ?? null,
      starts_at: row.starts_at,
      ends_at: row.ends_at ?? null,
      status: row.status ?? null,
      grade: row.grade ?? null,
      attempt: row.attempt ?? null,
      links: row.links ?? null,
      enrollment
    } satisfies Event;
  });
};

export const getAllEvents = async (): Promise<Event[]> => {
  const { data, hasSchedule } = await queryWithScheduleFallback<any>({
    withSchedule: () =>
      supabaseAdmin
        .from("events")
        .select(EVENT_WITH_ENROLLMENT_SCHEDULE_AND_TERM)
        .order("starts_at", { ascending: true }),
    withoutSchedule: () =>
      supabaseAdmin
        .from("events")
        .select(EVENT_WITH_ENROLLMENT_NO_SCHEDULE_AND_TERM)
        .order("starts_at", { ascending: true })
  });

  return (data ?? []).map((row: any) => {
    const enrollmentRaw = asSingle<any>(row.enrollment);
    const subject = asSingle<Subject>(enrollmentRaw?.subject);
    const term = asSingle<Term>(enrollmentRaw?.term);
    const enrollment: Enrollment | undefined = enrollmentRaw
      ? {
          id: enrollmentRaw.id,
          term_id: enrollmentRaw.term_id,
          subject_id: enrollmentRaw.subject_id,
          status: enrollmentRaw.status,
          color: enrollmentRaw.color ?? null,
          notes: enrollmentRaw.notes ?? null,
          schedule:
            hasSchedule && Array.isArray(enrollmentRaw.schedule)
              ? enrollmentRaw.schedule
              : [],
          subject: subject as Subject,
          term
        }
      : undefined;

    return {
      id: row.id,
      enrollment_id: row.enrollment_id,
      type: row.type,
      title: row.title ?? null,
      description: row.description ?? null,
      starts_at: row.starts_at,
      ends_at: row.ends_at ?? null,
      status: row.status ?? null,
      grade: row.grade ?? null,
      attempt: row.attempt ?? null,
      links: row.links ?? null,
      enrollment
    } satisfies Event;
  });
};

export const getUpcomingEvents = async (termId?: string) => {
  const now = new Date();
  const until = new Date(now.getTime() + 14 * DAY_MS);

  const withSchedule = () => {
    let query = supabaseAdmin
      .from("events")
      .select(EVENT_WITH_ENROLLMENT_SCHEDULE)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", until.toISOString())
      .order("starts_at", { ascending: true });
    if (termId) {
      query = query.eq("enrollment.term_id", termId);
    }
    return query;
  };

  const withoutSchedule = () => {
    let query = supabaseAdmin
      .from("events")
      .select(EVENT_WITH_ENROLLMENT_NO_SCHEDULE)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", until.toISOString())
      .order("starts_at", { ascending: true });
    if (termId) {
      query = query.eq("enrollment.term_id", termId);
    }
    return query;
  };

  const { data, hasSchedule } = await queryWithScheduleFallback<any>({
    withSchedule,
    withoutSchedule
  });

  return (data ?? []).map((row: any) => {
    const enrollmentRaw = asSingle<any>(row.enrollment);
    const subject = asSingle<Subject>(enrollmentRaw?.subject);
    const enrollment: Enrollment | undefined = enrollmentRaw
      ? {
          id: enrollmentRaw.id,
          term_id: enrollmentRaw.term_id,
          subject_id: enrollmentRaw.subject_id,
          status: enrollmentRaw.status,
          color: enrollmentRaw.color ?? null,
          notes: enrollmentRaw.notes ?? null,
          schedule:
            hasSchedule && Array.isArray(enrollmentRaw.schedule)
              ? enrollmentRaw.schedule
              : [],
          subject: subject as Subject,
          term: null
        }
      : undefined;

    return {
      id: row.id,
      enrollment_id: row.enrollment_id,
      type: row.type,
      title: row.title ?? null,
      description: row.description ?? null,
      starts_at: row.starts_at,
      ends_at: row.ends_at ?? null,
      status: row.status ?? null,
      grade: row.grade ?? null,
      attempt: row.attempt ?? null,
      links: row.links ?? null,
      enrollment
    } satisfies Event;
  });
};

export const getPrerequisites = async () => {
  const { data, error } = await supabaseAdmin
    .from("subject_prerequisites")
    .select("subject_id,prerequisite_id");
  if (error) {
    throw error;
  }
  return data ?? [];
};

export const getLatestEnrollmentStatus = async () => {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select(
      "subject_id,status,color,term:terms(label,start_date,is_current)"
    );

  if (error) {
    throw error;
  }

  const enrollments = data ?? [];
  const statusMap = new Map<
    string,
    { status: string; color: string | null; termLabel?: string | null }
  >();

  enrollments.forEach((row: any) => {
    const key = row.subject_id as string;
    const termLabel = row.term?.label as string | null;
    const isCurrent = row.term?.is_current as boolean | undefined;
    const existing = statusMap.get(key);
    if (!existing) {
      statusMap.set(key, {
        status: row.status,
        color: row.color,
        termLabel
      });
      return;
    }

    if (isCurrent) {
      statusMap.set(key, {
        status: row.status,
        color: row.color,
        termLabel
      });
      return;
    }

    if (sortTermLabel(termLabel) > sortTermLabel(existing.termLabel)) {
      statusMap.set(key, {
        status: row.status,
        color: row.color,
        termLabel
      });
    }
  });

  return statusMap;
};
