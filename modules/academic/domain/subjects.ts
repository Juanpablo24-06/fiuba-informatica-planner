import { z } from "zod";

const subjectUsefulLinkSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2048)
});

const subjectCustomFieldSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().max(2000)
});

const subjectBaseSchema = z.object({
  code: z.string().trim().min(1).max(32).nullable().optional(),
  name: z.string().trim().min(1),
  credits: z.number().int().min(0).nullable().optional(),
  weekly_hours: z.number().int().min(0).nullable().optional(),
  total_hours: z.number().int().min(0).nullable().optional(),
  term_suggested: z.number().int().positive().nullable().optional(),
  term_order: z.number().int().min(0).nullable().optional(),
  cycle: z.string().trim().nullable().optional(),
  type: z.string().trim().nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  requirements: z.array(z.string().trim().min(1)).max(64).nullable().optional(),
  evaluation_info: z.string().trim().max(10000).nullable().optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
  useful_links: z.array(subjectUsefulLinkSchema).max(64).optional(),
  custom_fields: z.array(subjectCustomFieldSchema).max(64).optional(),
  template: z.record(z.string(), z.any()).nullable().optional()
});

export const subjectCreateSchema = subjectBaseSchema;
export const subjectUpdateSchema = subjectBaseSchema.partial();
export const subjectPrerequisitesSchema = z.object({
  prerequisiteIds: z.array(z.string().uuid()).max(128).default([]),
  unlockIds: z.array(z.string().uuid()).max(128).optional()
});
