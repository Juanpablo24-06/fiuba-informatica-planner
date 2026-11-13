import "server-only";
import { createPlannerService } from "./application/scenarios";
import { plannerRepository } from "./adapters/supabase-scenarios";
export const plannerService = createPlannerService(plannerRepository);
import { createPlannerEntryService } from "./application/entries";
import { plannerEntryRepository } from "./adapters/supabase-entries";
export const plannerEntryService = createPlannerEntryService(plannerEntryRepository);
