export * from "@/modules/academic/domain/events";
import { academicService } from "@/modules/academic/server";
export const { listEvents, createEvent, updateEvent, deleteEvent } = academicService;
