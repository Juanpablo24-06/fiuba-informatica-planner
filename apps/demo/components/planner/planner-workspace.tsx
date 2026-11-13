import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Enrollment, Event, Term } from "@/lib/types";
import type { PlannerEntry } from "@/lib/planner/types";
import { plannerEntriesFromEnrollments } from "@/lib/planner/types";
import type { ParsedCommission } from "@/lib/planner/offer-parser";
import { findScheduleConflicts } from "@/lib/planner/conflicts";
import { cn } from "@/lib/utils";
import PlannerDrawer from "@/components/planner/planner-drawer";
import PlanningScenarioBar from "@/components/planner/planning-scenario-bar";
import PlanningGrid from "@/components/planner/planning-grid";
import PlanningRail from "@/components/planner/planning-rail";
import PlanningActivityComposer from "@/components/planner/planning-activity-composer";
import PlanningConfirmDialog from "@/components/planner/planning-confirm-dialog";
import { emptyScenario, normalizeSelection, normalizeSubjectOption, planningColorFor, selectionFromEntry, type PlanningActivity, type PlanningScenario, type PlanningSelection, type PlanningSubjectOption } from "@/components/planner/planning-types";
import {
  buildCalendarViewModel,
  buildMonthCells,
  CalendarMonthGrid,
  CalendarWorkspaceShell,
  type CalendarFilter
} from "@/components/planner/calendar-month-workspace";

const CALENDAR_DAYS = [
  { key: "lun", label: "Lun" }, { key: "mar", label: "Mar" }, { key: "mie", label: "Mié" },
  { key: "jue", label: "Jue" }, { key: "vie", label: "Vie" }, { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" }
] as const;
const HOURS = Array.from({ length: 15 }, (_, index) => index + 7);
const HOUR_HEIGHT = 56;
const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const isEntryActiveOn = (entry: PlannerEntry, date: Date) => {
  const key = dateKey(date);
  return entry.effectiveFrom <= key && (!entry.effectiveTo || entry.effectiveTo >= key);
};
const monday = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  return result;
};
const timeMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};
const plannerOfferId = (termId: string, offer: ParsedCommission) => `offer-${termId}-${offer.code ?? offer.activity}-${offer.commission}`
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9-]+/g, "-")
  .slice(0, 220);

type PositionedBlock = {
  entry: PlannerEntry;
  slot: PlannerEntry["slots"][number];
  column: number;
  columns: number;
};

type TemporalLayout = {
  dayCount: 1 | 3 | 6 | 7;
  hourHeight: number;
};

const EMPTY_SUBJECT_OPTIONS: unknown[] = [];

const normalizeScenarioPayload = (payload: unknown, termId: string, fallbackEntries: PlannerEntry[]): PlanningScenario[] => {
  const value = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const rawScenarios = Array.isArray(value.scenarios) ? value.scenarios : [];
  const scenarios = rawScenarios.map((raw, index) => {
    const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const rawSelections = Array.isArray(row.selections) ? row.selections : Array.isArray(row.entries) ? row.entries : [];
    const selections = rawSelections.map((item, selectionIndex) => normalizeSelection(item, selectionIndex)).filter((item): item is PlanningSelection => Boolean(item));
    const personalActivities: PlanningActivity[] = selections.filter((selection) => selection.kind === "personal" || selection.source === "personal").map((selection) => ({
      id: selection.id,
      title: selection.subjectName,
      kind: "Actividad personal",
      location: selection.blocks[0]?.location ?? null,
      notes: selection.notes ?? null,
      color: selection.color,
      blocks: selection.blocks
    }));
    return {
      id: typeof row.id === "string" ? row.id : `scenario-${termId}-${index + 1}`,
      termId,
      profileKey: typeof row.profileKey === "string" ? row.profileKey : "default",
      name: typeof row.name === "string" ? row.name : `Plan ${String.fromCharCode(65 + index)}`,
      position: typeof row.position === "number" ? row.position : index,
      lifecycle: (row.lifecycle === "confirmed" || row.lifecycle === "archived" ? row.lifecycle : "draft") as PlanningScenario["lifecycle"],
      confirmedAt: typeof row.confirmedAt === "string" ? row.confirmedAt : null,
      selections: selections.filter((selection) => selection.kind !== "personal" && selection.source !== "personal"),
      activities: Array.isArray(row.activities) ? row.activities.filter((activity): activity is PlanningActivity => Boolean(activity && typeof activity === "object" && typeof (activity as Record<string, unknown>).title === "string")).map((activity) => ({ ...activity, blocks: Array.isArray(activity.blocks) ? activity.blocks : [] })) : personalActivities
    };
  });
  const visibleScenarios = scenarios.filter((scenario) => scenario.lifecycle !== "archived");
  if (visibleScenarios.length > 0) return visibleScenarios.sort((a, b) => a.position - b.position);
  const legacySelections = fallbackEntries.map(selectionFromEntry);
  return [{ ...emptyScenario(termId), selections: legacySelections }];
};

const selectionOptionsFromEnrollments = (enrollments: Enrollment[]): PlanningSubjectOption[] => enrollments.map((enrollment) => ({
  id: enrollment.subject_id,
  subjectId: enrollment.subject_id,
  name: enrollment.subject.name,
  code: enrollment.subject.code,
  status: enrollment.status === "aprobado" ? "aprobado" : enrollment.status === "final_pendiente" ? "final_pendiente" : enrollment.status === "cursando" ? "cursando" : "available",
  statusLabel: enrollment.status === "aprobado" ? "Aprobada" : enrollment.status === "final_pendiente" ? "Final pendiente" : enrollment.status === "cursando" ? "Cursando" : "Disponible",
  blockedBy: [],
  termSuggested: enrollment.subject.term_suggested,
  termOrder: enrollment.subject.term_order ?? null,
  source: "catalog"
}));

const getTemporalLayout = (mode: "calendar" | "planning"): TemporalLayout => {
  const width = window.innerWidth;
  const availableHeight = window.innerHeight - (width < 640 ? 330 : 280);
  const hourHeight = Math.max(40, Math.min(56, Math.floor(availableHeight / HOURS.length)));
  return {
    dayCount: width < 640 ? 1 : width < 1024 ? 3 : mode === "planning" ? 6 : 7,
    hourHeight
  };
};

const useTemporalLayout = (mode: "calendar" | "planning") => {
  const [layout, setLayout] = useState<TemporalLayout>({ dayCount: mode === "planning" ? 6 : 7, hourHeight: HOUR_HEIGHT });

  useEffect(() => {
    const update = () => setLayout(getTemporalLayout(mode));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [mode]);

  return layout;
};

const layoutDayBlocks = (entries: PlannerEntry[], day: string): PositionedBlock[] => {
  const source = entries
    .flatMap((entry) => entry.slots.filter((slot) => slot.day === day).map((slot) => ({ entry, slot })))
    .sort((a, b) => timeMinutes(a.slot.start_time) - timeMinutes(b.slot.start_time));
  const result: PositionedBlock[] = [];
  let cluster: typeof source = [];
  let clusterEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const assigned = cluster.map((block) => {
      const start = timeMinutes(block.slot.start_time);
      let column = columnEnds.findIndex((end) => end <= start);
      if (column < 0) column = columnEnds.length;
      columnEnds[column] = timeMinutes(block.slot.end_time);
      return { ...block, column };
    });
    const columns = Math.max(1, columnEnds.length);
    result.push(...assigned.map((block) => ({ ...block, columns })));
    cluster = [];
    clusterEnd = -1;
  };
  source.forEach((block) => {
    const start = timeMinutes(block.slot.start_time);
    if (cluster.length && start >= clusterEnd) flush();
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, timeMinutes(block.slot.end_time));
  });
  flush();
  return result;
};

export default function PlannerWorkspace({
  term,
  terms,
  termWasExplicit,
  enrollments,
  events,
  mode,
  isAdmin,
  subjectOptions: initialSubjectOptions = EMPTY_SUBJECT_OPTIONS
}: { term: Term | null; terms: Term[]; termWasExplicit: boolean; enrollments: Enrollment[]; events: Event[]; isAdmin: boolean; mode: "calendar" | "planning"; subjectOptions?: unknown[] }) {
  const router = useRouter();
  const [mutationCount, setMutationCount] = useState(0);
  const [reloadVersion, reloadPlanner] = useState(0);
  const readOnly = !isAdmin || mutationCount > 0;
  const pathname = usePathname();
  const [view, setView] = useState<"week" | "month">(() => mode === "calendar" ? "month" : "week");
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>("all");
  const [anchor, setAnchor] = useState(() => new Date());
  const [drawer, setDrawer] = useState<"add" | "import" | null>(null);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const confirmedEntries = useMemo(() => plannerEntriesFromEnrollments(enrollments, term?.start_date ?? dateKey(new Date())).map((entry) => ({ ...entry, effectiveTo: term?.end_date ?? null })), [enrollments, term?.start_date, term?.end_date]);
  const [offers, setOffers] = useState<ParsedCommission[]>([]);
  const [scenarios, setScenarios] = useState<PlanningScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<PlanningSubjectOption[]>(() => {
    const provided = initialSubjectOptions.map(normalizeSubjectOption).filter((item): item is PlanningSubjectOption => Boolean(item));
    return provided.length ? provided : selectionOptionsFromEnrollments(enrollments);
  });
  const [activityComposer, setActivityComposer] = useState<{ initial: { day: string; start: string; end: string }; activity?: PlanningActivity | null } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [termPromptOpen, setTermPromptOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const temporalLayout = useTemporalLayout(mode);
  const storedScenario = scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0] ?? null;
  const activeScenario = storedScenario ? { ...storedScenario, selections: storedScenario.selections.map((selection) => {
    const selectedOffers = offers.filter((offer) => selection.offerIds?.includes(offer.raw ?? ""));
    return selectedOffers.length ? { ...selection, commissionName: selectedOffers[0].commission, commissionNames: selectedOffers.map((offer) => offer.commission), teachers: selectedOffers.flatMap((offer) => offer.teachers) } : selection;
  }) } : null;
  useEffect(() => {
    setRailCollapsed(window.localStorage.getItem("planner:rail-collapsed") === "true");
    setWorkspaceReady(true);
  }, []);
  useEffect(() => {
    if (!term) {
      setTermPromptOpen(true);
      return;
    }
    const stored = window.localStorage.getItem("academic:selected-term");
    if (termWasExplicit) {
      window.localStorage.setItem("academic:selected-term", term.id);
      setTermPromptOpen(false);
      return;
    }
    if (stored && terms.some((item) => item.id === stored)) {
      if (stored !== term.id) router.replace(`${pathname}?term=${encodeURIComponent(stored)}`);
      return;
    }
    window.localStorage.setItem("academic:selected-term", term.id);
    setTermPromptOpen(false);
  }, [pathname, router, term, terms, termWasExplicit]);
  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    const fallbackEntries = plannerEntriesFromEnrollments(enrollments, term.start_date ?? dateKey(new Date()))
      .map((entry) => ({ ...entry, effectiveTo: term.end_date }));
    if (mode === "calendar") {
      setEntries(fallbackEntries);
      return () => controller.abort();
    }
    const providedOptions = initialSubjectOptions.map(normalizeSubjectOption).filter((item): item is PlanningSubjectOption => Boolean(item));
    setSubjectOptions(providedOptions.length ? providedOptions : selectionOptionsFromEnrollments(enrollments));
    try {
      const stored = JSON.parse(window.localStorage.getItem(`planner:${term.id}`) ?? "null");
      setEntries(Array.isArray(stored) ? stored : fallbackEntries);
      const storedScenarios = JSON.parse(window.localStorage.getItem(`planner:scenarios:${term.id}`) ?? "null");
      const localScenarios = Array.isArray(storedScenarios) ? normalizeScenarioPayload({ scenarios: storedScenarios }, term.id, fallbackEntries) : normalizeScenarioPayload(null, term.id, fallbackEntries);
      setScenarios(localScenarios);
      setActiveScenarioId(window.localStorage.getItem(`planner:active:${term.id}`) ?? localScenarios[0]?.id ?? null);
      const storedOffers = JSON.parse(window.localStorage.getItem(`planner:offers:${term.id}`) ?? "null");
      setOffers(Array.isArray(storedOffers) ? storedOffers : []);
    } catch {
      setEntries(fallbackEntries);
      const fallbackScenario = normalizeScenarioPayload(null, term.id, fallbackEntries);
      setScenarios(fallbackScenario);
      setActiveScenarioId(fallbackScenario[0]?.id ?? null);
    }
    void fetch(`/api/planner?termId=${encodeURIComponent(term.id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: unknown) => {
        const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
        if (!data) return;
        if (Array.isArray(data.subjectOptions)) {
          const remoteOptions = data.subjectOptions.map(normalizeSubjectOption).filter((item): item is PlanningSubjectOption => Boolean(item));
          if (remoteOptions.length) setSubjectOptions(remoteOptions);
        }
        const nextScenarios = normalizeScenarioPayload(data, term.id, Array.isArray(data.entries) ? data.entries as PlannerEntry[] : fallbackEntries);
        setScenarios(nextScenarios);
        setActiveScenarioId((current) => current && nextScenarios.some((scenario) => scenario.id === current) ? current : typeof data.activeScenarioId === "string" ? data.activeScenarioId : nextScenarios[0]?.id ?? null);
        window.localStorage.setItem(`planner:scenarios:${term.id}`, JSON.stringify(nextScenarios));
        if (Array.isArray(data.entries)) {
          setEntries(data.entries as PlannerEntry[]);
          window.localStorage.setItem(`planner:${term.id}`, JSON.stringify(data.entries));
        }
      })
      .catch(() => undefined);
    if (mode === "planning") {
      void fetch(`/api/planner/offers?termId=${encodeURIComponent(term.id)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          if (!payload?.offers?.length) return;
          setOffers(payload.offers);
          window.localStorage.setItem(`planner:offers:${term.id}`, JSON.stringify(payload.offers));
        })
        .catch(() => undefined);
    }
    return () => controller.abort();
  }, [term, enrollments, mode, initialSubjectOptions, reloadVersion]);
  useEffect(() => {
    if (!term || !activeScenarioId) return;
    try { window.localStorage.setItem(`planner:active:${term.id}`, activeScenarioId); } catch { /* Optional view state. */ }
  }, [activeScenarioId, term]);
  useEffect(() => {
    if (mode !== "calendar" || !term) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(`calendar:view:${term.id}`) ?? "null");
      if (saved && Number.isFinite(Date.parse(saved.date))) {
        setAnchor(new Date(saved.date)); setView(saved.view === "week" ? "week" : "month"); return;
      }
    } catch { /* Restore the current academic period. */ }
    const today = dateKey(new Date());
    setAnchor(term.start_date && (today < term.start_date || (term.end_date && today > term.end_date)) ? new Date(`${term.start_date}T12:00:00`) : new Date());
    setView("month");
  }, [mode, term]);
  const rememberCalendar = (date: Date, nextView: "week" | "month") => {
    if (term) try { sessionStorage.setItem(`calendar:view:${term.id}`, JSON.stringify({ date: date.toISOString(), view: nextView })); } catch { /* Optional view state. */ }
  };
  const selectCalendarDate = (date: Date) => { setAnchor(date); rememberCalendar(date, view); };
  const selectCalendarView = (nextView: "week" | "month") => { setView(nextView); rememberCalendar(anchor, nextView); };
  useEffect(() => {
    const subjectId = new URLSearchParams(window.location.search).get("subject");
    if (mode !== "planning" || !subjectId || !isAdmin) return;
    const option = subjectOptions.find((item) => item.subjectId === subjectId || item.id === subjectId);
    if (option) { setQuery(option.name); setDrawer("add"); }
  }, [mode, subjectOptions, isAdmin]);
  const [effectiveMode, setEffectiveMode] = useState<"today" | "term">("today");
  const [importText, setImportText] = useState("");

  const weekStart = monday(anchor);
  const planWeekDays = CALENDAR_DAYS.slice(0, 6).map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return { ...day, date };
  });
  const calendarWeekDays = CALENDAR_DAYS.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return { ...day, date };
  });
  const anchorDayIndex = (anchor.getDay() + 6) % 7;
  const maxVisibleStart = Math.max(0, planWeekDays.length - temporalLayout.dayCount);
  const preferredVisibleStart = temporalLayout.dayCount === 7 || temporalLayout.dayCount === 6
    ? 0
    : temporalLayout.dayCount === 3
      ? anchorDayIndex - 1
      : anchorDayIndex;
  const visibleStartIndex = Math.min(maxVisibleStart, Math.max(0, preferredVisibleStart));
  const visiblePlanDays = planWeekDays.slice(visibleStartIndex, visibleStartIndex + temporalLayout.dayCount);
  const calendarStartIndex = Math.min(Math.max(0, calendarWeekDays.length - temporalLayout.dayCount), Math.max(0, preferredVisibleStart));
  const visibleCalendarDays = calendarWeekDays.slice(calendarStartIndex, calendarStartIndex + temporalLayout.dayCount);
  const filteredEnrollments = enrollments.filter((enrollment) =>
    `${enrollment.subject.code ?? ""} ${enrollment.subject.name}`.toLowerCase().includes(query.toLowerCase())
  );
  const monthCells = useMemo(() => buildMonthCells(anchor), [anchor]);
  const calendarViewModel = useMemo(
    () => buildCalendarViewModel({ entries: mode === "calendar" ? confirmedEntries : entries, events, referenceDate: anchor, filter: calendarFilter }),
    [anchor, calendarFilter, entries, events, mode, confirmedEntries]
  );
  const shiftAnchor = (amount: number) => {
    const next = new Date(anchor);
    if (view === "month") { next.setDate(1); next.setMonth(next.getMonth() + amount); }
    else next.setDate(next.getDate() + amount * temporalLayout.dayCount);
    selectCalendarDate(next);
  };
  const mutatePlanner = async (url: string, options: RequestInit) => {
    setMutationCount((count) => count + 1);
    setConfirmError(null);
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "No se pudo guardar el cambio. Volvé a intentarlo.");
      }
      return response;
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "No se pudo guardar el cambio.");
      reloadPlanner((value) => value + 1);
      throw error;
    } finally { setMutationCount((count) => count - 1); }
  };
  const importOffers = (nextOffers: ParsedCommission[]) => {
    if (!term || nextOffers.length === 0) return;
    const normalizedOffers = nextOffers.map((offer) => ({ ...offer, raw: plannerOfferId(term.id, offer) }));
    setOffers(normalizedOffers);
    window.localStorage.setItem(`planner:offers:${term.id}`, JSON.stringify(normalizedOffers));
    void mutatePlanner("/api/planner/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ termId: term.id, offers: nextOffers })
    }).catch(() => undefined);
    setImportText("");
    setDrawer("add");
  };
  const persistScenario = (scenario: PlanningScenario, method: "POST" | "PATCH" = "PATCH", action?: "empty") => {
    if (!term) return;
    void mutatePlanner(method === "POST" ? "/api/planner/scenarios" : `/api/planner/scenarios/${encodeURIComponent(scenario.id)}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(method === "POST" ? { termId: term.id, profileKey: "default", name: scenario.name } : action ? { action } : { name: scenario.name, lifecycle: scenario.lifecycle })
    }).catch(() => undefined);
  };
  const commitScenarios = (next: PlanningScenario[], nextActiveId?: string | null) => {
    setScenarios(next);
    if (nextActiveId !== undefined) setActiveScenarioId(nextActiveId);
    if (term) window.localStorage.setItem(`planner:scenarios:${term.id}`, JSON.stringify(next));
  };
  const updateActiveScenario = (updater: (scenario: PlanningScenario) => PlanningScenario) => {
    if (!activeScenario || activeScenario.lifecycle === "archived") return;
    const updated = { ...updater(activeScenario), lifecycle: "draft" as const, confirmedAt: null };
    const next = scenarios.map((scenario) => scenario.id === activeScenario.id ? updated : scenario);
    commitScenarios(next);
    persistScenario(updated);
  };
  const reconcileSelection = (temporaryId: string, payload: unknown) => {
    const remote = normalizeSelection(payload);
    if (!remote?.id || remote.id === temporaryId) return;
    setScenarios((previous) => previous.map((scenario) => ({
      ...scenario,
      selections: scenario.selections.map((selection) => selection.id === temporaryId ? { ...selection, ...remote, id: remote.id, scenarioId: scenario.id } : selection),
      activities: scenario.activities.map((activity) => activity.id === temporaryId ? { ...activity, id: remote.id, blocks: remote.blocks } : activity)
    })));
  };
  const reconcileScenario = (temporaryId: string, payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const row = payload as Record<string, unknown>;
    const remoteId = typeof row.id === "string" ? row.id : null;
    if (!remoteId || remoteId === temporaryId) return;
    const normalized = normalizeScenarioPayload({ scenarios: [row] }, term?.id ?? "", [])[0];
    setScenarios((previous) => previous.map((scenario) => scenario.id === temporaryId ? normalized : scenario));
    setActiveScenarioId((current) => current === temporaryId ? remoteId : current);
  };
  const createScenario = () => {
    if (!term) return;
    const position = scenarios.length;
    const scenario = emptyScenario(term.id, position, `Plan ${String.fromCharCode(65 + position)}`);
    scenario.id = `scenario-${term.id}-${crypto.randomUUID()}`;
    commitScenarios([...scenarios, scenario], scenario.id);
    void mutatePlanner("/api/planner/scenarios", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ termId: term.id, profileKey: "default", name: scenario.name }) }).then((response) => response.ok ? response.json() : null).then((payload) => reconcileScenario(scenario.id, payload?.scenario)).catch(() => undefined);
  };
  const renameScenario = (scenario: PlanningScenario) => {
    const nextName = window.prompt("Nombre del escenario", scenario.name)?.trim();
    if (!nextName || nextName === scenario.name) return;
    const updated = { ...scenario, name: nextName };
    commitScenarios(scenarios.map((item) => item.id === scenario.id ? updated : item));
    persistScenario(updated);
  };
  const duplicateScenario = (scenario: PlanningScenario) => {
    if (!term) return;
    const copyId = `scenario-${term.id}-${crypto.randomUUID()}`;
    const copy: PlanningScenario = {
      ...scenario,
      id: copyId,
      name: `${scenario.name} copia`,
      position: scenarios.length,
      lifecycle: "draft",
      confirmedAt: null,
      selections: scenario.selections.map((selection, index) => ({ ...selection, id: `${copyId}-selection-${index}`, scenarioId: copyId })),
      activities: scenario.activities.map((activity, index) => ({ ...activity, id: `${copyId}-activity-${index}` }))
    };
    commitScenarios([...scenarios, copy], copy.id);
    void mutatePlanner(`/api/planner/scenarios/${encodeURIComponent(scenario.id)}/duplicate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: copy.name }) }).then((response) => response.ok ? response.json() : null).then((payload) => reconcileScenario(copy.id, payload?.scenario)).catch(() => undefined);
  };
  const clearScenario = (scenario: PlanningScenario) => {
    const updated = { ...scenario, selections: [], activities: [], confirmedAt: null, lifecycle: "draft" as const };
    commitScenarios(scenarios.map((item) => item.id === scenario.id ? updated : item));
    persistScenario(updated, "PATCH", "empty");
  };
  const deleteScenario = (scenario: PlanningScenario) => {
    if (scenarios.length <= 1) return;
    const next = scenarios.filter((item) => item.id !== scenario.id);
    const nextActive = activeScenarioId === scenario.id ? next[0]?.id ?? null : activeScenarioId;
    commitScenarios(next, nextActive);
    if (term) void mutatePlanner(`/api/planner/scenarios/${encodeURIComponent(scenario.id)}`, { method: "DELETE" }).catch(() => undefined);
  };
  const slotsFromCommission = (commission: ParsedCommission): PlanningSelection["blocks"] => {
    const dayMap: Record<string, Enrollment["schedule"][number]["day"]> = {
      lunes: "lun", martes: "mar", miércoles: "mie", miercoles: "mie", jueves: "jue", viernes: "vie", sábado: "sab", sabado: "sab", domingo: "dom"
    };
    return commission.slots.flatMap((slot) => {
      const day = slot.day ? dayMap[slot.day.toLowerCase()] : undefined;
      if (!day || !slot.startTime || !slot.endTime) return [];
      const normalizedType = slot.classType.toLowerCase();
      const classType: NonNullable<Enrollment["schedule"][number]["class_type"]> = normalizedType.includes("práct") || normalizedType.includes("pract") ? "practice" : normalizedType.includes("teór") || normalizedType.includes("teor") ? "theory" : normalizedType.includes("lab") ? "laboratory" : normalizedType.includes("consulta") ? "consultation" : "other";
      return [{ day, start_time: slot.startTime, end_time: slot.endTime, location: slot.room ?? commission.location, class_type: classType }];
    });
  };
  const addSubjectToScenario = (option: PlanningSubjectOption) => {
    if (!activeScenario) return;
    const subjectId = option.source === "catalog" ? option.subjectId ?? option.id : null;
    const already = activeScenario.selections.some((selection) => (subjectId && selection.subjectId === subjectId) || (option.code && selection.subjectCode === option.code));
    if (already) { setDrawer(null); return; }
    const selection: PlanningSelection = {
      id: `selection-${subjectId ?? option.code ?? option.id}-${crypto.randomUUID()}`,
      scenarioId: activeScenario.id,
      kind: "course",
      title: option.name,
      subjectId,
      code: option.code,
      subjectName: option.name,
      subjectCode: option.code,
      status: option.status,
      statusSnapshot: option.status,
      statusLabel: option.statusLabel,
      blockedBy: option.blockedBy,
      notes: null,
      alignment: option.source === "manual" ? "external" : "unresolved",
      color: planningColorFor(`${option.code ?? option.name}-${activeScenario.selections.length}`, activeScenario.selections.map((item) => item.color)),
      commissionName: null,
      commissionNames: [],
      teachers: [],
      slots: option.manualBlocks ?? [],
      blocks: option.manualBlocks ?? [],
      source: option.source === "manual" ? "manual" : "offer",
      enrollmentId: null,
      confirmedEnrollmentId: null,
      offerIds: []
    };
    updateActiveScenario((scenario) => ({ ...scenario, selections: [...scenario.selections, selection] }));
    if (term) void mutatePlanner(`/api/planner/scenarios/${encodeURIComponent(activeScenario.id)}/selections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "course", subjectId: selection.subjectId, title: selection.title, code: selection.code, statusSnapshot: selection.statusSnapshot, alignment: selection.alignment, color: selection.color, slots: selection.slots, source: selection.source === "external" ? "manual" : selection.source, offerIds: [] })
    }).then((response) => response.ok ? response.json() : null).then((payload) => reconcileSelection(selection.id, payload?.selection)).catch(() => undefined);
    setDrawer(null);
  };
  const addEnrollmentToScenario = (enrollment: Enrollment) => addSubjectToScenario({ id: enrollment.subject_id, subjectId: enrollment.subject_id, name: enrollment.subject.name, code: enrollment.subject.code, status: enrollment.status === "aprobado" ? "aprobado" : enrollment.status === "final_pendiente" ? "final_pendiente" : enrollment.status === "cursando" ? "cursando" : "available", statusLabel: enrollment.status, blockedBy: [], termSuggested: enrollment.subject.term_suggested, termOrder: enrollment.subject.term_order ?? null, source: "catalog" });
  const addOfferToScenario = (course: ParsedCommission) => addSubjectToScenario({ id: course.code ?? course.activity, subjectId: null, name: course.activity, code: course.code, status: "available", statusLabel: "Oferta del período", blockedBy: [], termSuggested: null, termOrder: null, source: "offer", offer: course as unknown as Record<string, unknown> });
  const chooseCommission = (selection: PlanningSelection, commission: ParsedCommission) => {
    if (!activeScenario || !term) return;
    // A commission is an alternative schedule, not an additional course.
    const slots = slotsFromCommission(commission);
    const offerIds = commission.raw ? [commission.raw] : [];
    updateActiveScenario((scenario) => ({ ...scenario, lifecycle: "draft", selections: scenario.selections.map((item) => item.id === selection.id
      ? { ...item, commissionName: commission.commission, commissionNames: [commission.commission], offerIds, teachers: commission.teachers, slots, blocks: slots }
      : item) }));
    void mutatePlanner(`/api/planner/scenarios/${encodeURIComponent(activeScenario.id)}/selections/${encodeURIComponent(selection.id)}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ slots, title: selection.title, code: selection.subjectCode, color: selection.color, offerIds })
    }).then((response) => { if (!response.ok) throw new Error("No se pudo guardar la comisión. Volvé a intentarlo."); })
      .catch((error: Error) => setConfirmError(error.message));
    setDrawer(null);
  };
  const removeSelection = (selection: PlanningSelection) => {
    updateActiveScenario((scenario) => ({ ...scenario, selections: scenario.selections.filter((item) => item.id !== selection.id) }));
    if (term) void mutatePlanner(`/api/planner/scenarios/${encodeURIComponent(activeScenario?.id ?? "")}/selections/${encodeURIComponent(selection.id)}`, { method: "DELETE" }).catch(() => undefined);
  };
  const updateSelectionColor = (selection: PlanningSelection, color: string) => {
    updateActiveScenario((scenario) => ({ ...scenario, selections: scenario.selections.map((item) => item.id === selection.id ? { ...item, color } : item) }));
    if (term) void mutatePlanner(`/api/planner/scenarios/${encodeURIComponent(activeScenario?.id ?? "")}/selections/${encodeURIComponent(selection.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ color }) }).catch(() => undefined);
  };
  const saveActivity = (value: Omit<PlanningActivity, "id"> & { id?: string }) => {
    const activityId = value.id ?? `activity-${crypto.randomUUID()}`;
    const existingActivity = Boolean(value.id && activeScenario?.activities.some((item) => item.id === value.id));
    updateActiveScenario((scenario) => {
      const activity = { ...value, id: activityId } as PlanningActivity;
      const exists = scenario.activities.some((item) => item.id === activity.id);
      return { ...scenario, activities: exists ? scenario.activities.map((item) => item.id === activity.id ? activity : item) : [...scenario.activities, activity] };
    });
    if (term && activeScenario) void mutatePlanner(existingActivity ? `/api/planner/scenarios/${encodeURIComponent(activeScenario.id)}/selections/${encodeURIComponent(value.id ?? "")}` : `/api/planner/scenarios/${encodeURIComponent(activeScenario.id)}/selections`, { method: existingActivity ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "personal", title: value.title, notes: value.notes, color: value.color, slots: value.blocks, source: "personal", alignment: "external" }) }).then((response) => response.ok ? response.json() : null).then((payload) => { if (!existingActivity) reconcileSelection(activityId, payload?.selection); }).catch(() => undefined);
    setActivityComposer(null);
  };
  const confirmScenario = async (resolutions: Record<string, "existing" | "create" | "external">, linkedSubjectIds: Record<string, string | null>) => {
    if (!activeScenario || !term) return;
    setConfirmPending(true);
    setConfirmError(null);
    try {
      const alignments = activeScenario.selections.map((selection) => {
        const mode = resolutions[selection.id] ?? (selection.subjectId ? "existing" : "external");
        const subjectId = mode === "existing" ? selection.subjectId ?? linkedSubjectIds[selection.id] ?? null : null;
        return { selectionId: selection.id, mode: mode === "existing" ? "linked" : mode === "create" ? "created" : "external", subjectId, name: selection.subjectName, code: selection.subjectCode, termSuggested: null, type: null };
      });
      if (alignments.some((alignment) => alignment.mode === "linked" && !alignment.subjectId)) {
        setConfirmError("Elegí una materia existente para cada vínculo antes de confirmar.");
        return;
      }
      const response = await mutatePlanner(`/api/planner/scenarios/${encodeURIComponent(activeScenario.id)}/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ alignments }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        setConfirmError(payload?.error ?? "No se pudo confirmar el plan. Revisá las selecciones e intentá nuevamente.");
        return;
      }
      const updated = { ...activeScenario, lifecycle: "confirmed" as const, confirmedAt: new Date().toISOString() };
      commitScenarios(scenarios.map((scenario) => scenario.id === activeScenario.id ? updated : scenario));
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setConfirmError("No se pudo guardar el plan. Revisá la conexión e intentá nuevamente.");
    } finally {
      setConfirmPending(false);
    }
  };
  const selectTerm = (termId: string) => {
    window.localStorage.setItem("academic:selected-term", termId);
    setTermPromptOpen(false);
    router.replace(`${pathname}?term=${encodeURIComponent(termId)}`);
  };

  return (
    <div className={cn("space-y-3", mode === "calendar" ? "pb-20" : "pb-20")} data-workspace-ready={workspaceReady ? "true" : "false"}>
      {confirmError && !confirmOpen ? <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{confirmError}</p> : null}
      {mode === "calendar" ? (
        <CalendarWorkspaceShell
          term={term}
          terms={terms}
          cells={monthCells}
          referenceDate={anchor}
          filter={calendarFilter}
          metrics={calendarViewModel.metrics}
          upcoming={calendarViewModel.upcoming}
          view={view}
          onSelectTerm={selectTerm}
          onSelectDate={selectCalendarDate}
          onToday={() => selectCalendarDate(new Date())}
          onShift={shiftAnchor}
          onFilterChange={setCalendarFilter}
          onViewChange={selectCalendarView}
        >
          {view === "week" ? (
            <>
              {temporalLayout.dayCount < 7 ? <CompactDayPicker days={calendarWeekDays} anchor={anchor} onSelect={selectCalendarDate} /> : null}
              <WeekGrid entries={calendarViewModel.entries} events={calendarViewModel.events} weekDays={visibleCalendarDays} hourHeight={temporalLayout.hourHeight} />
            </>
          ) : (
            <div data-calendar-month="true">
              <CalendarMonthGrid
                entries={calendarViewModel.entries}
                events={calendarViewModel.events}
                cells={monthCells}
                referenceDate={anchor}
                onSelectDate={(date) => { setAnchor(date); setView("week"); rememberCalendar(date, "week"); }}
              />
            </div>
          )}
        </CalendarWorkspaceShell>
      ) : (
        <>
          <p className="px-1 text-xs text-muted">Explorá alternativas con tus materias. Elegí una comisión y confirmá el plan para actualizar Cursos y Calendario.</p>
          <PlanningScenarioBar readOnly={readOnly} term={term} terms={terms} scenarios={scenarios} activeScenarioId={activeScenarioId} subjectCount={activeScenario?.selections.length ?? 0} weeklyHours={Math.round((activeScenario?.selections ?? []).reduce((sum, selection) => sum + selection.blocks.reduce((subtotal, block) => subtotal + Math.max(0, timeMinutes(block.end_time) - timeMinutes(block.start_time)) / 60, 0), 0) * 10) / 10} conflicts={findScheduleConflicts((activeScenario?.selections ?? []).flatMap((selection) => selection.blocks)).length} canImport={false} onSelectTerm={selectTerm} onSelectScenario={setActiveScenarioId} onCreateScenario={createScenario} onRenameScenario={renameScenario} onDuplicateScenario={duplicateScenario} onClearScenario={clearScenario} onDeleteScenario={deleteScenario} onImport={() => setDrawer("import")} onConfirm={() => setConfirmOpen(true)} />

          {temporalLayout.dayCount < 6 ? <CompactDayPicker days={planWeekDays} anchor={anchor} onSelect={selectCalendarDate} /> : null}
          <div className={cn("grid gap-3 transition-[grid-template-columns]", railCollapsed ? "xl:grid-cols-[minmax(0,1fr)_52px]" : "xl:grid-cols-[minmax(0,1fr)_310px]")}>
            <PlanningGrid readOnly={readOnly} selections={activeScenario?.selections ?? []} activities={activeScenario?.activities ?? []} weekDays={visiblePlanDays} hourHeight={temporalLayout.hourHeight} onCreateActivity={(initial) => { if (isAdmin) setActivityComposer({ initial }); }} onSelectActivity={(activity) => isAdmin && setActivityComposer({ initial: { day: activity.blocks[0]?.day ?? "lun", start: activity.blocks[0]?.start_time ?? "09:00", end: activity.blocks[0]?.end_time ?? "10:00" }, activity })} />
            <PlanningRail readOnly={readOnly} selections={activeScenario?.selections ?? []} offers={offers} collapsed={railCollapsed} onToggle={() => setRailCollapsed((current) => { const next = !current; window.localStorage.setItem("planner:rail-collapsed", String(next)); return next; })} onChooseCommission={chooseCommission} onRemove={removeSelection} onColorChange={updateSelectionColor} onAdd={() => setDrawer("add")} />
          </div>
        </>
      )}

      {drawer ? <PlannerDrawer mode={drawer} query={query} setQuery={setQuery} enrollments={filteredEnrollments} subjectOptions={subjectOptions} offers={offers.filter((offer) => `${offer.code ?? ""} ${offer.activity}`.toLowerCase().includes(query.toLowerCase()))} onClose={() => setDrawer(null)} onAdd={addEnrollmentToScenario} onAddCourse={addOfferToScenario} onAddSubject={addSubjectToScenario} onImport={importOffers} effectiveMode={effectiveMode} setEffectiveMode={setEffectiveMode} importText={importText} setImportText={setImportText} /> : null}
      {activityComposer ? <PlanningActivityComposer initial={activityComposer.initial} activity={activityComposer.activity} onClose={() => setActivityComposer(null)} onSave={saveActivity} /> : null}
      {confirmOpen ? <PlanningConfirmDialog selections={activeScenario?.selections ?? []} subjectOptions={subjectOptions} pending={confirmPending} error={confirmError} onClose={() => { setConfirmError(null); setConfirmOpen(false); }} onConfirm={confirmScenario} /> : null}
      {termPromptOpen ? <div className="fixed inset-x-0 bottom-0 top-[var(--app-header-height,96px)] z-40 grid place-items-center bg-surface/85 p-6 backdrop-blur-xl"><div className="w-full max-w-md"><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">Cuatrimestre</p><h2 className="mt-2 text-2xl font-semibold text-text">Elegí dónde vas a trabajar</h2>{terms.length > 0 ? <div className="mt-5 divide-y divide-border/35 border-y border-border/35">{terms.map((item) => <button key={item.id} type="button" onClick={() => selectTerm(item.id)} className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-text transition hover:px-2 hover:text-accent"><span>{item.label}</span><span className="text-xs font-normal text-muted">{item.start_date ?? "Sin inicio"}</span></button>)}</div> : <p className="mt-4 text-sm text-muted">Primero creá un cuatrimestre desde Admin.</p>}</div></div> : null}
    </div>
  );
}

function CompactDayPicker({ days, anchor, onSelect }: { days: { key: string; label: string; date: Date }[]; anchor: Date; onSelect: (date: Date) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1 rounded-[1.25rem] border border-border/40 bg-surface/80 p-1.5 lg:hidden">
      {days.map((day) => {
        const selected = dateKey(day.date) === dateKey(anchor);
        return (
          <button key={day.key} type="button" onClick={() => onSelect(day.date)} className={cn("min-w-0 rounded-xl px-1 py-2 text-center transition", selected ? "bg-accent text-accent-content" : "text-muted hover:bg-surface-2 hover:text-text")}>
            <span className="block text-[8px] font-bold uppercase tracking-[0.12em]">{day.label.slice(0, 2)}</span>
            <span className="mt-0.5 block text-sm font-semibold">{day.date.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({ entries, events, weekDays, hourHeight }: { entries: PlannerEntry[]; events: Event[]; weekDays: { key: string; label: string; date: Date }[]; hourHeight: number }) {
  const now = new Date();
  const days = weekDays.map((day) => {
    const dayEvents = events.filter((event) => dateKey(new Date(event.starts_at)) === dateKey(day.date));
    const eventEntries = dayEvents.map<PlannerEntry>((event) => {
      const start = new Date(event.starts_at);
      const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 3600000);
      const time = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      return { id: `event-${event.id}`, enrollmentId: event.enrollment_id, subjectId: "", subjectName: event.title ?? event.type, subjectCode: null, commissionName: "Evaluación / evento", teachers: [], color: event.enrollment?.color ?? null, status: event.status ?? "pendiente", effectiveFrom: dateKey(start), effectiveTo: dateKey(end), source: "enrollment", slots: [{ day: day.key as Enrollment["schedule"][number]["day"], start_time: time(start), end_time: dateKey(end) > dateKey(start) ? "24:00" : time(end), location: null }] };
    });
    return { ...day, blocks: layoutDayBlocks([...entries.filter((entry) => isEntryActiveOn(entry, day.date)), ...eventEntries], day.key) };
  });
  const blocks = days.flatMap((day) => day.blocks);
  const firstHour = Math.max(0, Math.min(7, ...blocks.map(({ slot }) => Math.floor(timeMinutes(slot.start_time) / 60))));
  const lastHour = Math.min(24, Math.max(22, ...blocks.map(({ slot }) => Math.ceil(timeMinutes(slot.end_time) / 60))));
  const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index);
  const columns = `48px repeat(${days.length}, minmax(0, 1fr))`;
  return <section aria-label="Horario semanal" className="overflow-hidden rounded-3xl border border-border/45 bg-surface/80">
    {!blocks.length ? <p className="border-b border-border/40 p-4 text-sm text-muted">Sin clases ni eventos en estos días. Podés cambiar la fecha o revisar otro cuatrimestre.</p> : null}
    <div className="context-scrollbar max-h-[70dvh] overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-20 grid border-b border-border/40 bg-surface/95 backdrop-blur-xl" style={{ gridTemplateColumns: columns }}>
        <div className="self-end pb-3 text-center text-[10px] text-muted">Hora</div>
        {days.map((day) => <div key={day.key} className="border-l border-border/30 py-3 text-center"><p className="text-xs text-muted">{day.label}</p><p className={cn("mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-lg font-semibold", dateKey(day.date) === dateKey(now) && "bg-accent text-accent-contrast")}>{day.date.getDate()}</p></div>)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: columns }}>
        <div>{hours.map((hour) => <div key={hour} style={{ height: hourHeight }} className="border-b border-border/20 pr-2 pt-1 text-right text-[10px] text-muted">{String(hour).padStart(2, "0")}:00</div>)}</div>
        {days.map((day) => <div key={day.key} className="relative border-l border-border/30">
          {hours.map((hour) => <div key={hour} style={{ height: hourHeight }} className="border-b border-border/20"/>)}
          {day.blocks.map(({ entry, slot, column, columns: count }, index) => <div key={`${entry.id}-${index}`} title={`${entry.subjectName} · ${slot.start_time}–${slot.end_time}${slot.location ? ` · ${slot.location}` : ""}`} className={cn("absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5", entry.id.startsWith("event-") ? "bg-accent-2/20" : "bg-accent/12")} style={{ top: (timeMinutes(slot.start_time) / 60 - firstHour) * hourHeight, height: Math.max(28, (timeMinutes(slot.end_time) - timeMinutes(slot.start_time)) / 60 * hourHeight), left: `calc(${column * 100 / count}% + 3px)`, width: `calc(${100 / count}% - 6px)`, borderColor: entry.color ?? "rgb(var(--color-accent))" }}><p className="truncate text-xs font-semibold">{entry.subjectName}</p><p className="text-[10px] text-muted">{slot.start_time}–{slot.end_time}</p>{slot.location ? <p className="truncate text-[10px] text-muted">{slot.location}</p> : null}</div>)}
        </div>)}
      </div>
    </div>
  </section>;
}
