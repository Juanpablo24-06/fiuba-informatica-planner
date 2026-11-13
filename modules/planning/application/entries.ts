import type { PlannerEntry } from "../domain/types";
import type { ParsedCommission } from "../domain/offer-parser";
import type { EnrollmentScheduleSlot } from "@/modules/academic/domain/types";

export type PlannerEntryRecord = {
  id: string; profile_key: string; term_id: string;
  enrollment_id: string | null; subject_id: string | null;
  subject_name: string; subject_code: string | null; commission_name: string | null;
  teachers: string[]; color: string | null; status: string;
  effective_from: string; effective_to: string | null;
  slots: EnrollmentScheduleSlot[]; source: "enrollment" | "import"; updated_at?: string;
};
export type PlannerOfferRecord = {
  id: string; term_id: string; profile_key: string; subject_code: string | null;
  activity: string; commission_name: string; teachers: string[]; slots: ParsedCommission["slots"];
  shift: string | null; capacity: string | null; instance: string | null; location: string | null;
};
export interface PlannerEntryRepository {
  listEntries(termId: string, profileKey: string): Promise<PlannerEntryRecord[]>;
  removeEntries(ids: string[]): Promise<void>;
  saveEntries(rows: PlannerEntryRecord[]): Promise<PlannerEntryRecord[]>;
  updateEntry(id: string, patch: Partial<PlannerEntryRecord>): Promise<void>;
  insertEntry(row: PlannerEntryRecord): Promise<void>;
  listOffers(termId: string, profileKey: string): Promise<PlannerOfferRecord[]>;
  removeOffers(termId: string, profileKey: string): Promise<void>;
  insertOffers(rows: PlannerOfferRecord[]): Promise<void>;
}

const offerId = (termId: string, offer: ParsedCommission) =>
  `offer-${termId}-${offer.code ?? offer.activity}-${offer.commission}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]+/g, "-").slice(0, 220);

export const createPlannerEntryService = (repository: PlannerEntryRepository, now = () => new Date()) => {
  const listEntries = async (termId: string, profile = "default"): Promise<PlannerEntry[]> => (await repository.listEntries(termId, profile)).map((row) => ({
    id: row.id, enrollmentId: row.enrollment_id ?? "", subjectId: row.subject_id ?? row.subject_code ?? row.subject_name,
    subjectName: row.subject_name, subjectCode: row.subject_code, commissionName: row.commission_name,
    teachers: Array.isArray(row.teachers) ? row.teachers : [], color: row.color, status: row.status,
    effectiveFrom: row.effective_from, effectiveTo: row.effective_to, slots: row.slots ?? [], source: row.source
  }));
  const replaceEntries = async (termId: string, entries: PlannerEntry[]) => {
    const rows = entries.map((entry) => ({
      id: entry.id, profile_key: "default", term_id: termId, enrollment_id: entry.enrollmentId || null,
      subject_id: entry.source === "enrollment" ? entry.subjectId || null : null,
      subject_name: entry.subjectName, subject_code: entry.subjectCode, commission_name: entry.commissionName,
      teachers: entry.teachers, color: entry.color, status: entry.status, effective_from: entry.effectiveFrom,
      effective_to: entry.effectiveTo, slots: entry.slots, source: entry.source, updated_at: now().toISOString()
    }));
    const current = await repository.listEntries(termId, "default");
    const ids = new Set(rows.map((row) => row.id));
    const removed = current.map((row) => row.id).filter((id) => !ids.has(id));
    if (removed.length) await repository.removeEntries(removed);
    return rows.length ? repository.saveEntries(rows) : [];
  };
  const listOffers = async (termId: string) => (await repository.listOffers(termId, "default")).map((row) => ({
    raw: row.id, name: row.commission_name, schedule: null, activity: row.activity, code: row.subject_code,
    commission: row.commission_name, shift: row.shift, capacity: row.capacity, instance: row.instance,
    location: row.location, teachers: Array.isArray(row.teachers) ? row.teachers : [], slots: Array.isArray(row.slots) ? row.slots : []
  }));
  const replaceOffers = async (termId: string, offers: ParsedCommission[]) => {
    const rows = offers.map((offer) => ({
      id: offerId(termId, offer), profile_key: "default", term_id: termId,
      subject_code: offer.code, activity: offer.activity, commission_name: offer.commission,
      shift: offer.shift, capacity: offer.capacity, instance: offer.instance, location: offer.location,
      teachers: offer.teachers, slots: offer.slots, imported_at: now().toISOString()
    }));
    await repository.removeOffers(termId, "default");
    if (rows.length) await repository.insertOffers(rows);
    return rows.length;
  };
  const closeEntries = async (termId: string, subject: { code: string | null; name: string }, effectiveFrom: string) => {
    const entries = await repository.listEntries(termId, "default");
    const matching = entries.filter((entry) => !entry.effective_to && (subject.code ? entry.subject_code === subject.code : entry.subject_name === subject.name));
    const previous = new Date(`${effectiveFrom}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    for (const entry of matching) {
      if (entry.effective_from >= effectiveFrom) await repository.removeEntries([entry.id]);
      else await repository.updateEntry(entry.id, { effective_to: previous.toISOString().slice(0, 10), updated_at: now().toISOString() });
    }
  };
  const setCommission = async (input: { termId: string; subject: { id: string; code: string | null; name: string }; commissionQuery: string; effectiveFrom: string }) => {
    const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const offers = await repository.listOffers(input.termId, "default");
    const matching = offers.filter((offer) => (input.subject.code ? offer.subject_code === input.subject.code : normalize(offer.activity) === normalize(input.subject.name)) && normalize(`${offer.commission_name} ${(offer.teachers ?? []).join(" ")}`).includes(normalize(input.commissionQuery)));
    if (matching.length !== 1) throw new Error(matching.length === 0 ? `No encontré la comisión '${input.commissionQuery}' de ${input.subject.name}.` : `La comisión '${input.commissionQuery}' coincide con ${matching.length} opciones; indicá un nombre o docente más preciso.`);
    const offer = matching[0];
    const days: Record<string, EnrollmentScheduleSlot["day"]> = { lunes: "lun", martes: "mar", miercoles: "mie", jueves: "jue", viernes: "vie", sabado: "sab", domingo: "dom" };
    const slots: EnrollmentScheduleSlot[] = (offer.slots ?? []).flatMap((slot) => {
      const day = slot.day ? days[normalize(slot.day)] : null;
      if (!day || !slot.startTime || !slot.endTime) return [];
      const kind = normalize(slot.classType ?? "");
      return [{ day, start_time: slot.startTime, end_time: slot.endTime, location: slot.room ?? null, class_type: kind.includes("pract") ? "practice" : kind.includes("teor") ? "theory" : kind.includes("lab") ? "laboratory" : kind.includes("consulta") ? "consultation" : "other" }];
    });
    if (!slots.length) throw new Error(`La comisión '${offer.commission_name}' no tiene horarios utilizables.`);
    await closeEntries(input.termId, input.subject, input.effectiveFrom);
    const id = normalize(`ai-${input.termId}-${input.subject.code ?? input.subject.id}-${offer.commission_name}-${input.effectiveFrom}`).replace(/[^a-z0-9-]+/g, "-").slice(0, 220);
    await repository.insertEntry({ id, profile_key: "default", term_id: input.termId, enrollment_id: null, subject_id: null, subject_name: input.subject.name, subject_code: input.subject.code, commission_name: offer.commission_name, teachers: offer.teachers ?? [], color: null, status: "planned", effective_from: input.effectiveFrom, effective_to: null, slots, source: "import", updated_at: now().toISOString() });
    return offer.commission_name;
  };
  return { listEntries, replaceEntries, listOffers, replaceOffers, closeEntries, setCommission };
};
export type PlannerEntryService = ReturnType<typeof createPlannerEntryService>;
