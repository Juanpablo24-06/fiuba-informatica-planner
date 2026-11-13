import * as domain from "../domain/scenarios";
import type { PlannerRepository } from "./ports";
import type { PlannerSelection } from "../domain/types";
import { PlannerSchemaUnavailableError } from "../domain/errors";
const { plannerScenarioCreateSchema, plannerScenarioUpdateSchema, plannerSelectionCreateSchema, plannerSelectionUpdateSchema, plannerConfirmSchema, mapPlannerSelectionRow, mapPlannerScenarioRow, selectionReferencesMatch, normalizeDuplicatedSelectionRow } = domain;
import type { PlannerScenarioCreateInput, PlannerScenarioUpdateInput, PlannerSelectionCreateInput, PlannerSelectionUpdateInput, PlannerConfirmInput } from "../domain/scenarios";
const assertAvailable = (error: Error | null) => { if (error) throw error; };
export const createPlannerService = (repository: PlannerRepository) => {
  const idFor = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

  const invalidReference = (message: string) => {
    const error = new Error(message);
    Object.assign(error, { status: 422 });
    return error;
  };

  const scenarioLifecycleOf = (scenario: Record<string, unknown>) => {
    const lifecycle = String(scenario.lifecycle ?? "draft");
    return lifecycle === "confirmed" || lifecycle === "archived" ? lifecycle : "draft";
  };

  const lifecycleError = (message: string) => {
    const error = new Error(message);
    Object.assign(error, { status: 409 });
    return error;
  };

  const assertScenarioDraft = (scenario: Record<string, unknown>, operation: string) => {
    const lifecycle = scenarioLifecycleOf(scenario);
    if (lifecycle === "archived") throw lifecycleError(`No se puede ${operation} un escenario archivado.`);
    if (lifecycle === "confirmed") throw lifecycleError(`El escenario está confirmado. Reabrilo explícitamente antes de ${operation}.`);
  };

  const validateSelectionReferences = async (termId: string, subjectId?: string | null, enrollmentId?: string | null) => {
    if (subjectId) {
      const subject = await repository.findSubject(subjectId);
      if (subject.error) throw subject.error;
      if (!subject.data) throw invalidReference("La materia no existe o está archivada.");
    }
    if (enrollmentId) {
      const enrollment = await repository.findEnrollment(enrollmentId);
      if (enrollment.error) throw enrollment.error;
      if (!enrollment.data || String(enrollment.data.term_id) !== termId) throw invalidReference("La cursada no pertenece al período del escenario.");
      if (!selectionReferencesMatch(subjectId, typeof enrollment.data.subject_id === "string" ? enrollment.data.subject_id : null)) throw invalidReference("La cursada no corresponde a la materia seleccionada.");
    }
  };

  const ensurePlannerScenario = async (termId: string, profileKey = "default") => {
    const existing = await repository.listScenarios(termId, profileKey);
    assertAvailable(existing.error);
    const active = (existing.data ?? []).find((row) => row.lifecycle !== "archived");
    if (active) return active as Record<string, unknown>;
    if (existing.data?.length) {
      const restored = await repository.updateScenario(String(existing.data[0].id), profileKey, { lifecycle: "draft", confirmed_at: null, updated_at: new Date().toISOString() });
      assertAvailable(restored.error);
      return restored.data as Record<string, unknown>;
    }

    const created = await repository.insertScenario({ id: idFor("planner-scenario"), term_id: termId, profile_key: profileKey, name: "Plan A", position: 0, lifecycle: "draft" });
    assertAvailable(created.error);
    return created.data as Record<string, unknown>;
  };

  const getPlannerScenarioBundle = async (termId: string, profileKey = "default") => {
    const defaultScenario = await ensurePlannerScenario(termId, profileKey);
    const [scenariosResult, selectionsResult] = await Promise.all([
      repository.listScenarios(termId, profileKey, true),
      repository.listSelections(String(defaultScenario.id))
    ]);
    assertAvailable(scenariosResult.error);
    assertAvailable(selectionsResult.error);

    const scenarioRows = (scenariosResult.data ?? []) as Record<string, unknown>[];
    const scenarioIds = scenarioRows.map((row) => String(row.id));
    const selectionRows = (selectionsResult.data ?? []) as Record<string, unknown>[];
    let allSelectionRows = selectionRows;
    if (scenarioIds.length > 1 || !selectionRows.length) {
      const allSelections = await repository.listSelectionsForScenarios(scenarioIds);
      assertAvailable(allSelections.error);
      allSelectionRows = (allSelections.data ?? []) as Record<string, unknown>[];
    }
    let allLinks: Record<string, unknown>[] = [];
    if (allSelectionRows.length) {
      const allLinksResult = await repository.listOfferLinks(allSelectionRows.map((row) => String(row.id)));
      if (allLinksResult.error && !(allLinksResult.error instanceof PlannerSchemaUnavailableError)) throw allLinksResult.error;
      allLinks = (allLinksResult.data ?? []) as Record<string, unknown>[];
    }
    const offerIdsBySelection = new Map<string, string[]>();
    allLinks.forEach((link) => {
      const selectionId = String(link.selection_id);
      const ids = offerIdsBySelection.get(selectionId) ?? [];
      ids.push(String(link.offer_id));
      offerIdsBySelection.set(selectionId, ids);
    });
    const selectionsByScenario = new Map<string, PlannerSelection[]>();
    allSelectionRows.forEach((row) => {
      const selection = mapPlannerSelectionRow(row, offerIdsBySelection.get(String(row.id)) ?? []);
      const current = selectionsByScenario.get(selection.scenarioId) ?? [];
      current.push(selection);
      selectionsByScenario.set(selection.scenarioId, current);
    });
    const scenarios = scenarioRows.map((row) => mapPlannerScenarioRow(row, selectionsByScenario.get(String(row.id)) ?? []));
    return { scenarios, activeScenarioId: scenarios.find((scenario) => scenario.lifecycle !== "archived")?.id ?? null };
  };

  const getPlannerScenario = async (id: string, profileKey = "default") => {
    const result = await repository.findScenario(id, profileKey);
    assertAvailable(result.error);
    return result.data as Record<string, unknown> | null;
  };

  const createPlannerScenario = async (input: PlannerScenarioCreateInput) => {
    const parsed = plannerScenarioCreateSchema.parse(input);
    const existing = await repository.lastPosition(parsed.termId, parsed.profileKey);
    assertAvailable(existing.error);
    const position = Number(existing.data?.position ?? -1) + 1;
    const result = await repository.insertScenario({ id: idFor("planner-scenario"), term_id: parsed.termId, profile_key: parsed.profileKey, name: parsed.name, position, lifecycle: "draft" });
    assertAvailable(result.error);
    return mapPlannerScenarioRow(result.data as Record<string, unknown>);
  };

  const updatePlannerScenario = async (id: string, input: PlannerScenarioUpdateInput, profileKey = "default") => {
    const parsed = plannerScenarioUpdateSchema.parse(input);
    const current = await getPlannerScenario(id, profileKey);
    if (!current) return null;
    const currentLifecycle = scenarioLifecycleOf(current);
    if (currentLifecycle === "archived") throw lifecycleError("No se puede modificar un escenario archivado.");
    if (parsed.action === "reopen" && currentLifecycle !== "confirmed") throw lifecycleError("Solo se puede reabrir un escenario confirmado.");
    if (currentLifecycle === "confirmed" && parsed.action !== "reopen" && parsed.action !== "empty") throw lifecycleError("El escenario confirmado debe reabrirse antes de editarlo.");
    if (parsed.lifecycle && parsed.lifecycle !== currentLifecycle && !(parsed.action === "reopen" && parsed.lifecycle === "draft")) {
      throw lifecycleError("El estado del escenario solo cambia mediante la acción correspondiente.");
    }
    if (parsed.action === "empty") {
      const deleted = await repository.deleteSelections(id);
      assertAvailable(deleted.error);
    }
    const patch: Record<string, unknown> = {};
    if (parsed.name) patch.name = parsed.name;
    if (parsed.action === "empty" || parsed.action === "reopen") {
      patch.lifecycle = "draft";
      patch.confirmed_at = null;
    } else if (parsed.lifecycle) {
      patch.lifecycle = parsed.lifecycle;
    }
    if (Object.keys(patch).length) {
      patch.updated_at = new Date().toISOString();
      const updated = await repository.updateScenario(id, profileKey, patch);
      assertAvailable(updated.error);
      return mapPlannerScenarioRow(updated.data as Record<string, unknown>);
    }
    return mapPlannerScenarioRow(current);
  };

  const deletePlannerScenario = async (id: string, profileKey = "default") => {
    const current = await getPlannerScenario(id, profileKey);
    if (!current) return null;
    if (scenarioLifecycleOf(current) === "archived") throw lifecycleError("El escenario ya está archivado.");
    const others = await repository.listScenarios(String(current.term_id), profileKey, true, id);
    assertAvailable(others.error);
    if (!others.data?.length) {
      const error = new Error("No se puede eliminar el último escenario.");
      Object.assign(error, { status: 409 });
      throw error;
    }
    const deleted = await repository.updateScenario(id, profileKey, { lifecycle: "archived", updated_at: new Date().toISOString() });
    assertAvailable(deleted.error);
    return { id };
  };

  const duplicatePlannerScenario = async (id: string, profileKey = "default", name?: string) => {
    const source = await getPlannerScenario(id, profileKey);
    if (!source) return null;
    if (scenarioLifecycleOf(source) === "archived") throw lifecycleError("No se puede duplicar un escenario archivado.");
    const scenario = await createPlannerScenario({ termId: String(source.term_id), profileKey, name: name?.trim() || `${source.name} copia` });
    const selections = await repository.listSelections(id);
    assertAvailable(selections.error);
    if (selections.data?.length) {
      const sourceRows = selections.data as Record<string, unknown>[];
      const selectionIds = new Map<string, string>();
      const copied = sourceRows.map((row) => {
        const nextId = idFor("planner-selection");
        selectionIds.set(String(row.id), nextId);
        const copy = normalizeDuplicatedSelectionRow(row, scenario.id, nextId);
        return copy;
      });
      const inserted = await repository.insertSelections(copied);
      assertAvailable(inserted.error);
      const sourceLinks = await repository.listOfferLinks(sourceRows.map((row) => String(row.id)));
      if (!sourceLinks.error && sourceLinks.data?.length) {
        const copiedLinks = (sourceLinks.data as Record<string, unknown>[]).flatMap((link) => {
          const selectionId = selectionIds.get(String(link.selection_id));
          return selectionId ? [{ selection_id: selectionId, offer_id: link.offer_id, sort_order: link.sort_order, role: link.role }] : [];
        });
        if (copiedLinks.length) {
          const linksInserted = await repository.insertOfferLinks(copiedLinks);
          assertAvailable(linksInserted.error);
        }
      } else if (sourceLinks.error && !(sourceLinks.error instanceof PlannerSchemaUnavailableError)) {
        throw sourceLinks.error;
      }
    }
    return await getPlannerScenarioBundle(String(source.term_id), profileKey).then((bundle) => bundle.scenarios.find((item) => item.id === scenario.id) ?? scenario);
  };

  const createPlannerSelection = async (scenarioId: string, input: PlannerSelectionCreateInput, profileKey = "default") => {
    const parsed = plannerSelectionCreateSchema.parse(input);
    const scenario = await getPlannerScenario(scenarioId, profileKey);
    if (!scenario) return null;
    assertScenarioDraft(scenario, "crear selecciones");
    await validateSelectionReferences(String(scenario.term_id), parsed.subjectId, parsed.enrollmentId);
    const id = parsed.id ?? idFor("planner-selection");
    const row = {
      id,
      scenario_id: scenarioId,
      kind: parsed.kind,
      subject_id: parsed.subjectId ?? null,
      enrollment_id: parsed.enrollmentId ?? null,
      title: parsed.title,
      code: parsed.code ?? null,
      status_snapshot: parsed.statusSnapshot ?? null,
      alignment: parsed.kind === "personal" ? "external" : parsed.alignment ?? "unresolved",
      color: parsed.color ?? null,
      notes: parsed.notes ?? null,
      slots: parsed.slots ?? [],
      source: parsed.source ?? (parsed.kind === "personal" ? "personal" : "manual"),
      confirmed_enrollment_id: null
    };
    const inserted = await repository.insertSelection(row);
    assertAvailable(inserted.error);
    if (parsed.offerIds?.length) await setPlannerSelectionOffers(id, parsed.offerIds, profileKey);
    return mapPlannerSelectionRow(inserted.data as Record<string, unknown>, parsed.offerIds ?? []);
  };

  const updatePlannerSelection = async (scenarioId: string, selectionId: string, input: PlannerSelectionUpdateInput, profileKey = "default") => {
    const parsed = plannerSelectionUpdateSchema.parse(input);
    const scenario = await getPlannerScenario(scenarioId, profileKey);
    if (!scenario) return null;
    assertScenarioDraft(scenario, "editar selecciones");
    const current = await repository.findSelection(selectionId, scenarioId);
    assertAvailable(current.error);
    if (!current.data) return null;
    const nextSubjectId = parsed.kind === "personal" ? null : parsed.subjectId === undefined ? (typeof current.data.subject_id === "string" ? current.data.subject_id : null) : parsed.subjectId;
    const nextEnrollmentId = parsed.kind === "personal" ? null : parsed.enrollmentId === undefined ? (typeof current.data.enrollment_id === "string" ? current.data.enrollment_id : null) : parsed.enrollmentId;
    await validateSelectionReferences(String(scenario.term_id), nextSubjectId, nextEnrollmentId);
    const patch: Record<string, unknown> = {};
    const mappings: Record<string, string> = { subjectId: "subject_id", enrollmentId: "enrollment_id", statusSnapshot: "status_snapshot", code: "code", alignment: "alignment", color: "color", notes: "notes", slots: "slots", source: "source", title: "title", kind: "kind" };
    Object.entries(parsed).forEach(([key, value]) => { if (key !== "offerIds" && value !== undefined) patch[mappings[key] ?? key] = value; });
    if (patch.kind === "personal") {
      patch.subject_id = null;
      patch.enrollment_id = null;
      patch.alignment = "external";
    }
    patch.updated_at = new Date().toISOString();
    const updated = await repository.updateSelection(selectionId, scenarioId, patch);
    assertAvailable(updated.error);
    if (parsed.offerIds) await setPlannerSelectionOffers(selectionId, parsed.offerIds, profileKey);
    const links = await getPlannerSelectionOffers(selectionId, scenarioId);
    return mapPlannerSelectionRow(updated.data as Record<string, unknown>, links);
  };

  const deletePlannerSelection = async (scenarioId: string, selectionId: string, profileKey = "default") => {
    const scenario = await getPlannerScenario(scenarioId, profileKey);
    if (!scenario) return null;
    assertScenarioDraft(scenario, "eliminar selecciones");
    const deleted = await repository.deleteSelection(selectionId, scenarioId);
    assertAvailable(deleted.error);
    return { id: selectionId };
  };

  const getPlannerSelectionOffers = async (selectionId: string, scenarioId?: string) => {
    const selection = await repository.findSelection(selectionId, scenarioId);
    assertAvailable(selection.error);
    if (!selection.data) return [];
    const result = await repository.listSelectionOffers(selectionId);
    if (result.error && result.error instanceof PlannerSchemaUnavailableError) throw new PlannerSchemaUnavailableError();
    if (result.error) throw result.error;
    return ((result.data ?? []) as Record<string, unknown>[]).map((row) => String(row.offer_id));
  };

  const setPlannerSelectionOffers = async (selectionId: string, offerIds: string[], profileKey = "default", expectedScenarioId?: string) => {
    const selection = await repository.findSelection(selectionId, expectedScenarioId);
    assertAvailable(selection.error);
    if (!selection.data) return null;
    const scenario = await getPlannerScenario(String(selection.data.scenario_id), profileKey);
    if (!scenario) return null;
    assertScenarioDraft(scenario, "editar comisiones");
    const uniqueOfferIds = [...new Set(offerIds)];
    if (uniqueOfferIds.length) {
      const offers = await repository.findOffers(String(scenario.term_id), profileKey, uniqueOfferIds);
      assertAvailable(offers.error);
      if ((offers.data ?? []).length !== uniqueOfferIds.length) {
        const error = new Error("Una o más comisiones no pertenecen a la oferta del período.");
        Object.assign(error, { status: 422 });
        throw error;
      }
    }
    const removed = await repository.deleteOfferLinks(selectionId);
    assertAvailable(removed.error);
    if (uniqueOfferIds.length) {
      const inserted = await repository.insertOfferLinks(uniqueOfferIds.map((offerId, sortOrder) => ({ selection_id: selectionId, offer_id: offerId, sort_order: sortOrder })));
      assertAvailable(inserted.error);
    }
    return uniqueOfferIds;
  };

  const confirmPlannerScenario = async (scenarioId: string, input: PlannerConfirmInput, profileKey = "default") => {
    const parsed = plannerConfirmSchema.parse(input);
    const scenario = await getPlannerScenario(scenarioId, profileKey);
    if (!scenario) return null;
    assertScenarioDraft(scenario, "confirmar");
    const result = await repository.confirmScenario(scenarioId, profileKey, parsed.alignments);
    assertAvailable(result.error);
    return result.data;
  };

  const listPlannerSelections = async (scenarioId: string) => {
    const result = await repository.listSelections(scenarioId);
    assertAvailable(result.error);
    return Promise.all((result.data ?? []).map(async (row) => mapPlannerSelectionRow(row, await getPlannerSelectionOffers(String(row.id)))));
  };
  return { listPlannerSelections, ensurePlannerScenario, getPlannerScenarioBundle, getPlannerScenario, createPlannerScenario, updatePlannerScenario, deletePlannerScenario, duplicatePlannerScenario, createPlannerSelection, updatePlannerSelection, deletePlannerSelection, getPlannerSelectionOffers, setPlannerSelectionOffers, confirmPlannerScenario };
};
export type PlannerService = ReturnType<typeof createPlannerService>;
