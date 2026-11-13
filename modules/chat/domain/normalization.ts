export const monthMap: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12
};

export type DateInferenceMode = "start" | "end";

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export const pad = (value: number) => String(value).padStart(2, "0");

export const getMonthEndDay = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

export const normalizeTermLabel = (value: string) => {
  const cleaned = value.trim().replace(/\s+/g, " ");
  const match = cleaned.match(/^(\d{4})[\s_-]*(0|1|2)$/i);
  if (!match) return cleaned;
  return `${match[1]}-${match[2].toUpperCase()}`;
};

export const inferDateFromPhrase = (
  phrase: string,
  fallbackYear: number | null,
  mode: DateInferenceMode
) => {
  const normalized = normalizeText(phrase).replace(/[.,]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  let year = fallbackYear;
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
      const num = Number(token);
      if (num >= 1 && num <= 31) day = num;
    }
  }

  if (!year || !month) return null;

  if (!day) {
    if (mode === "start") {
      day = normalized.includes("medio") ? 15 : 1;
    } else {
      day =
        normalized.includes("inicio") || normalized.includes("principio")
          ? 1
          : getMonthEndDay(year, month);
    }
  }

  const maxDay = getMonthEndDay(year, month);
  if (day > maxDay) day = maxDay;
  return `${year}-${pad(month)}-${pad(day)}`;
};

const romanToArabic = (value: string) =>
  value
    .replace(/\biii\b/gi, "3")
    .replace(/\bii\b/gi, "2")
    .replace(/\biv\b/gi, "4")
    .replace(/\bvi\b/gi, "6")
    .replace(/\bv\b/gi, "5")
    .replace(/\bi\b/gi, "1");

export const normalizeSubjectAlias = (value: string) =>
  normalizeText(romanToArabic(value))
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
