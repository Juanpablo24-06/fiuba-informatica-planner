export type Role = "admin" | "viewer";

export type EvaluationTemplate = {
  parciales?: number;
  recuperatorios?: number;
  tps?: number;
  defensas?: number;
  finales?: number;
  promocion?: boolean;
  notas?: string;
};

export type Subject = {
  id: string;
  code: string | null;
  name: string;
  credits: number | null;
  weekly_hours: number | null;
  total_hours: number | null;
  term_suggested: number | null;
  cycle: string | null;
  type: string | null;
  requirements: string[] | null;
  template: EvaluationTemplate | null;
};

export type Term = {
  id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

export type Enrollment = {
  id: string;
  term_id: string;
  subject_id: string;
  status: string;
  color: string | null;
  notes: string | null;
  subject: Subject;
  term: Term | null;
};

export type EventLink = {
  label: string;
  url: string;
};

export type Event = {
  id: string;
  enrollment_id: string;
  type: string;
  title: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string | null;
  grade: number | null;
  attempt: number | null;
  links: EventLink[] | null;
  enrollment?: Enrollment;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  source: "calendar" | "internal";
  subject?: string;
  type?: string;
  color?: string;
  tags?: string[];
};
