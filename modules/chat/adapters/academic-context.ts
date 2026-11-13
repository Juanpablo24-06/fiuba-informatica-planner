import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAllEvents, getEnrollmentSummaryByTermIds, getPrerequisites, getSubjects, getTerms } from "@/modules/academic/adapters/read-queries";
import { getWeekRange } from "@/lib/date";
import { normalizeText } from "../domain/normalization";
import type { Term } from "@/modules/academic/domain/types";
import type { ChatPayload } from "../domain/request";
import type { ChatContextReader, ConversationRepository } from "../application/ports";
export const createChatContextReader = (conversations: ConversationRepository): ChatContextReader => {
  const shouldIncludeCalendarContext = (message: string) =>
    /\b(calendario|agenda|evento|eventos|semana|hoy|manana|mañana|parcial|final|entrega)\b/.test(
      normalizeText(message)
    );

  const resolveCurrentTerm = (terms: Term[]) =>
    terms.find((term) => term.is_current) ?? terms[0] ?? null;

  const load = async (payload: ChatPayload) => {
    const now = new Date();
    const includeCalendarContext = shouldIncludeCalendarContext(payload.message);
    const weekRange = getWeekRange(now);
    const historyFromRequest = payload.history ?? [];
    const historyPromise = historyFromRequest.length
      ? Promise.resolve([])
      : conversations.findHistory(payload.threadId);
    const rawEventsPromise = includeCalendarContext
      ? supabaseAdmin
          .from("calendar_events_raw")
          .select(
            "provider_event_id,title,starts_at,ends_at,calendar_event_enrichments(kind,instance,tags,needs_review,confidence,subject_id)"
          )
          .gte("starts_at", weekRange.start.toISOString())
          .lte("starts_at", weekRange.end.toISOString())
      : Promise.resolve({ data: [] as any[] });
    const [subjects, terms, historyFromDb, rawEventsResult] = await Promise.all([
      getSubjects(),
      getTerms(),
      historyPromise,
      rawEventsPromise
    ]);
    const currentTerm = resolveCurrentTerm(terms);
    const termIds = terms.map((term) => term.id);
    const includePlannerContext = /planific|horario|comisi[oó]n|cursad|cruce|superpon/i.test(payload.message);
    const [enrollmentsByTermMap, allEvents, prerequisites, plannerResult] = await Promise.all([
      getEnrollmentSummaryByTermIds(termIds),
      getAllEvents(),
      getPrerequisites(),
      supabaseAdmin.from("planner_entries").select("id,term_id,subject_name,subject_code,commission_name,teachers,slots,effective_from,effective_to,status").order("effective_from", { ascending: false }).limit(120)
    ]);
    const plannerEntries = plannerResult.data ?? [];
    const plannerCodes = [...new Set(plannerEntries.map((entry: any) => entry.subject_code).filter(Boolean))] as string[];
    const plannerOffersResult = includePlannerContext && plannerCodes.length > 0
      ? await supabaseAdmin.from("planner_offers").select("term_id,subject_code,activity,commission_name,teachers,slots,shift,capacity").in("subject_code", plannerCodes).limit(160)
      : { data: [] as any[] };
    const mappedEvents = allEvents.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      status: event.status,
      grade: event.grade,
      attempt: event.attempt,
      links: event.links,
      term: event.enrollment?.term?.label ?? null,
      subject: event.enrollment?.subject?.name ?? null,
      subject_code: event.enrollment?.subject?.code ?? null,
      enrollment_status: event.enrollment?.status ?? null,
      schedule: event.enrollment?.schedule ?? []
    }));
    const weekEvents = mappedEvents.filter((event) => {
      const time = new Date(event.starts_at).getTime();
      return time >= weekRange.start.getTime() && time < weekRange.end.getTime();
    });
    const enrichments = (rawEventsResult.data ?? [])
      .flatMap((row: any) =>
        (row.calendar_event_enrichments ?? []).map((enrichment: any) => ({
          provider_event_id: row.provider_event_id,
          title: row.title,
          starts_at: row.starts_at,
          kind: enrichment.kind,
          instance: enrichment.instance,
          tags: enrichment.tags ?? [],
          needs_review: enrichment.needs_review ?? false
        }))
      )
      .slice(0, 100);
    const enrollmentsByTerm = terms.map((term) => ({
      term_label: term.label,
      courses: (enrollmentsByTermMap.get(term.id) ?? []).map((enrollment) => ({
        subject: enrollment.subject.name,
        code: enrollment.subject.code,
        status: enrollment.status
      }))
    }));
    return {
      subjects,
      recentMessages: historyFromRequest.length ? historyFromRequest : historyFromDb,
      context: {
        now: now.toISOString(),
        term: currentTerm
          ? {
              label: currentTerm.label,
              start_date: currentTerm.start_date,
              end_date: currentTerm.end_date
            }
          : null,
        terms: terms.map((term) => ({
          label: term.label,
          start_date: term.start_date,
          end_date: term.end_date,
          is_current: term.is_current
        })),
        subjects: subjects.map((subject) => ({
          name: subject.name,
          code: subject.code,
          credits: subject.credits,
          weekly_hours: subject.weekly_hours,
          total_hours: subject.total_hours,
          term_suggested: subject.term_suggested,
          cycle: subject.cycle,
          type: subject.type,
          requirements: subject.requirements
        })),
        enrollments_by_term: enrollmentsByTerm,
        events: mappedEvents,
        week_events: weekEvents,
        week_enrichments: includeCalendarContext ? enrichments : [],
        planner: plannerEntries.map((entry: any) => ({
          term: terms.find((term) => term.id === entry.term_id)?.label ?? null,
          subject: entry.subject_name,
          code: entry.subject_code,
          commission: entry.commission_name,
          teachers: entry.teachers ?? [],
          slots: entry.slots ?? [],
          effective_from: entry.effective_from,
          effective_to: entry.effective_to,
          status: entry.status
        })),
        planner_offer_options: includePlannerContext ? (plannerOffersResult.data ?? []).map((offer: any) => ({
          term: terms.find((term) => term.id === offer.term_id)?.label ?? null,
          code: offer.subject_code,
          subject: offer.activity,
          commission: offer.commission_name,
          teachers: offer.teachers ?? [],
          slots: offer.slots ?? [],
          shift: offer.shift,
          capacity: offer.capacity
        })) : [],
        subject_prerequisites: prerequisites
      }
    };
  };

  return { load };
};
