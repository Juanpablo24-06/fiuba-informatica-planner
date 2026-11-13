export class PlannerSchemaUnavailableError extends Error {
  readonly status = 503;
  constructor() {
    super("La migración de planificación todavía no está aplicada.");
    this.name = "PlannerSchemaUnavailableError";
  }
}
