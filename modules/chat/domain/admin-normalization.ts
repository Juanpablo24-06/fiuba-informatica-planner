import { getMonthEndDay, monthMap, normalizeTermLabel, normalizeText, pad } from "./normalization";
import type { Term as TermLite } from "@/modules/academic/domain/types";
export const normalizeColor = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[\da-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
};

export const findTermByLabel = (terms: TermLite[], label: string) => {
  const normalized = normalizeText(normalizeTermLabel(label));
  return terms.find((term) => normalizeText(term.label) === normalized) ?? null;
};

export const normalizeTermDate = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= getMonthEndDay(year, month)
    ) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= getMonthEndDay(year, month)
    ) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  const normalized = normalizeText(trimmed).replace(/[.,]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  for (const token of tokens) {
    if (!year && /^\d{4}$/.test(token)) {
      year = Number(token);
      continue;
    }
    if (!month && token in monthMap) {
      month = monthMap[token];
      continue;
    }
    if (!day && /^\d{1,2}$/.test(token)) {
      const numeric = Number(token);
      if (numeric >= 1 && numeric <= 31) {
        day = numeric;
      }
    }
  }

  if (!year || !month) return undefined;
  if (!day) {
    if (normalized.includes("final") || normalized.includes("fin")) {
      day = getMonthEndDay(year, month);
    } else if (normalized.includes("medio")) {
      day = 15;
    } else {
      day = 1;
    }
  }
  if (day > getMonthEndDay(year, month)) return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
};
