export const CBC_TERM_LABEL = "2023-0";
export const CBC_TERM_START = "2023-03-01";
export const CBC_TERM_END = "2023-12-20";
export type CbcSubject = { id: string; name: string; code: string | null; cycle: string | null; type: string | null };
export type BootstrapStatus = {
  loaded: boolean; term: string; term_id: string | null;
  approved: number; total: number; missing: number; subjects: CbcSubject[];
};
export const buildBootstrapSummary = ({ loaded, approved, total, term = CBC_TERM_LABEL }: {
  loaded: boolean; approved: number; total: number; term?: string;
}) => loaded
  ? `CBC registrado correctamente: ${approved}/${total} aprobadas en ${term}.`
  : `CBC actualizado parcialmente: ${approved}/${total} aprobadas en ${term}.`;
