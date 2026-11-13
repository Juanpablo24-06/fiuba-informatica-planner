import type { PlannerAlignmentInput } from "../domain/scenarios";

export type PlanningRow = Record<string, unknown>;
export type RepositoryResult<T> = { data: T | null; error: Error | null };
export interface PlannerRepository {
  findSubject(id: string): Promise<RepositoryResult<PlanningRow>>;
  findEnrollment(id: string): Promise<RepositoryResult<PlanningRow>>;
  listScenarios(termId: string, profileKey: string, activeOnly?: boolean, exceptId?: string): Promise<RepositoryResult<PlanningRow[]>>;
  findScenario(id: string, profileKey: string): Promise<RepositoryResult<PlanningRow>>;
  lastPosition(termId: string, profileKey: string): Promise<RepositoryResult<PlanningRow>>;
  insertScenario(row: PlanningRow): Promise<RepositoryResult<PlanningRow>>;
  updateScenario(id: string, profileKey: string, patch: PlanningRow): Promise<RepositoryResult<PlanningRow>>;
  listSelections(scenarioId: string): Promise<RepositoryResult<PlanningRow[]>>;
  listSelectionsForScenarios(ids: string[]): Promise<RepositoryResult<PlanningRow[]>>;
  findSelection(id: string, scenarioId?: string): Promise<RepositoryResult<PlanningRow>>;
  insertSelection(row: PlanningRow): Promise<RepositoryResult<PlanningRow>>;
  insertSelections(rows: PlanningRow[]): Promise<RepositoryResult<PlanningRow[]>>;
  updateSelection(id: string, scenarioId: string, patch: PlanningRow): Promise<RepositoryResult<PlanningRow>>;
  deleteSelection(id: string, scenarioId: string): Promise<RepositoryResult<null>>;
  deleteSelections(scenarioId: string): Promise<RepositoryResult<null>>;
  listOfferLinks(selectionIds: string[]): Promise<RepositoryResult<PlanningRow[]>>;
  listSelectionOffers(selectionId: string): Promise<RepositoryResult<PlanningRow[]>>;
  findOffers(termId: string, profileKey: string, ids: string[]): Promise<RepositoryResult<PlanningRow[]>>;
  deleteOfferLinks(selectionId: string): Promise<RepositoryResult<null>>;
  insertOfferLinks(rows: PlanningRow[]): Promise<RepositoryResult<null>>;
  confirmScenario(id: string, profileKey: string, alignments: PlannerAlignmentInput[]): Promise<RepositoryResult<unknown>>;
}
