export type EvaluationTemplate = {
  parciales?: number;
  recuperatorios?: number;
  tps?: number;
  defensas?: number;
  finales?: number;
  promocion?: boolean;
  notas?: string;
};

export type SubjectUsefulLink = {
  label: string;
  url: string;
};

export type SubjectCustomField = {
  label: string;
  value: string;
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
  /** Additive fields are optional in fixtures built against the pre-008 shape. */
  description?: string | null;
  term_order?: number | null;
  evaluation_info?: string | null;
  notes?: string | null;
  useful_links?: SubjectUsefulLink[];
  custom_fields?: SubjectCustomField[];
  deleted_at?: string | null;
};

export type Term = {
  id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

export type EnrollmentScheduleDay = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export type EnrollmentScheduleSlot = {
  day: EnrollmentScheduleDay;
  start_time: string;
  end_time: string;
  location: string | null;
  class_type?: "theory" | "practice" | "laboratory" | "consultation" | "other";
};

export type Enrollment = {
  id: string;
  term_id: string;
  subject_id: string;
  status: string;
  color: string | null;
  notes: string | null;
  schedule: EnrollmentScheduleSlot[];
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
