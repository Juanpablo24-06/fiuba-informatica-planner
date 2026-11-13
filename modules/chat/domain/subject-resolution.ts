import { normalizeSubjectAlias, normalizeText } from "@/modules/chat/domain/normalization";

export type SubjectLite = {
  id: string;
  code: string | null;
  name: string;
};

type SubjectSearchEntry = {
  subject: SubjectLite;
  codeKey: string;
  nameKey: string;
  displayLabel: string;
};

export const buildSubjectSearchIndex = (subjects: SubjectLite[]) =>
  subjects.map((subject) => ({
    subject,
    codeKey: normalizeText(subject.code ?? ""),
    nameKey: normalizeSubjectAlias(subject.name),
    displayLabel: `${subject.code ?? "SIN-COD"} ${subject.name}`
  }));

export const resolveSubjectByQuery = (
  index: SubjectSearchEntry[],
  query: string
):
  | { subject: SubjectLite }
  | { error: string } => {
  const normalizedCodeQuery = normalizeText(query);
  const normalizedNameQuery = normalizeSubjectAlias(query);

  if (!normalizedCodeQuery && !normalizedNameQuery) {
    return { error: "La consulta de materia llegó vacía." };
  }

  const byCode = index.filter((entry) => entry.codeKey === normalizedCodeQuery);
  if (byCode.length === 1) {
    return { subject: byCode[0].subject };
  }
  if (byCode.length > 1) {
    return { error: `La materia '${query}' coincide con varios códigos.` };
  }

  const byExactName = index.filter(
    (entry) => entry.nameKey === normalizedNameQuery
  );
  if (byExactName.length === 1) {
    return { subject: byExactName[0].subject };
  }
  if (byExactName.length > 1) {
    return {
      error: `La materia '${query}' coincide con varios nombres exactos.`
    };
  }

  const byPartial = index.filter((entry) => {
    const codeMatches =
      normalizedCodeQuery.length > 0 && entry.codeKey.includes(normalizedCodeQuery);
    const nameMatches =
      normalizedNameQuery.length > 0 && entry.nameKey.includes(normalizedNameQuery);
    return codeMatches || nameMatches;
  });
  if (byPartial.length === 1) {
    return { subject: byPartial[0].subject };
  }
  if (byPartial.length > 1) {
    const options = byPartial
      .slice(0, 4)
      .map((entry) => entry.displayLabel)
      .join(" / ");
    return {
      error: `Consulta ambigua para '${query}'. Opciones: ${options}.`
    };
  }

  return {
    error: `No se encontró ninguna materia que coincida con '${query}'.`
  };
};
