import { describe, expect, it } from 'vitest';
import { buildMapGraph } from '@/lib/map/map-graph';
import { computeHorizontalLayout } from '@/lib/map/map-layout';
import type { Subject } from '@/lib/types';

describe('CBC structural layout', () => {
  it('keeps suggested periods in separate columns regardless of names and explicit ordering', () => {
    const subjects = Array.from({ length: 6 }, (_, index) => ({
      id: `cbc-${index}`, name: `CBC personalizada ${index}`, code: String(index),
      credits: 6, weekly_hours: 4, total_hours: 64, term_suggested: index < 3 ? 1 : 2,
      term_order: index + 1, cycle: 'cbc', type: 'obligatoria', requirements: null, template: null
    })) satisfies Subject[];
    const { nodes, edges } = buildMapGraph({ subjects, prerequisites: [], statusMap: new Map() });
    const layout = computeHorizontalLayout(nodes, edges);
    const positions = subjects.map((subject) => layout.nodeLayouts[subject.id]);
    expect(new Set(positions.slice(0, 3).map((node) => node.x)).size).toBe(1);
    expect(new Set(positions.slice(3).map((node) => node.x)).size).toBe(1);
    expect(positions[3].x).toBeGreaterThan(positions[0].x + positions[0].width);
    expect(layout.nodeLayouts.__cbc__.x).toBeGreaterThan(positions[3].x);
    const all = Object.values(layout.nodeLayouts);
    all.forEach((a, index) => all.slice(index + 1).forEach((b) => {
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    }));
  });
});
