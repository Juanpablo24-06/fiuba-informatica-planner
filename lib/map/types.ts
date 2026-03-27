import type { EvaluationTemplate } from "@/lib/types";

export type MapNode = {
  id: string;
  name: string;
  code: string | null;
  term: number | null;
  type: string | null;
  cycle?: string | null;
  status?: string | null;
  color?: string | null;
  requirements?: string[] | null;
  credits?: number | null;
  weekly_hours?: number | null;
  total_hours?: number | null;
  template?: EvaluationTemplate | null;
  display_kind?: "final_project" | "cbc_cluster" | null;
  progress_credits?: number | null;
};

export type MapEdge = {
  from: string;
  to: string;
};

export type Transform = {
  x: number;
  y: number;
  scale: number;
};

export type NodeLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
};

export type SectionLayout = {
  term: number;
  left: number;
  width: number;
};

export type LayoutResult = {
  nodeLayouts: Record<string, NodeLayout>;
  sections: SectionLayout[];
  width: number;
  height: number;
};

export type FinalProjectTrack = "tesis" | "trabajo_profesional";

export type MapStatusEntry = {
  status: string;
  color: string | null;
  termLabel?: string | null;
};

export type MapPrerequisiteRow = {
  prerequisite_id: string;
  subject_id: string;
};
