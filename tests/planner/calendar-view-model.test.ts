import { describe, expect, it } from 'vitest';
import { buildCalendarViewModel } from '@/components/planner/calendar-month-workspace';
import type { Event } from '@/lib/types';

describe('calendar filters', () => {
  it('uses the same exam filter for the grid and upcoming list', () => {
    const date = new Date(); date.setDate(date.getDate() + 1);
    const events = [
      { id: 'exam', type: 'parcial', title: 'Parcial', starts_at: date.toISOString() },
      { id: 'meeting', type: 'otro', title: 'Reunión', starts_at: date.toISOString() }
    ] as Event[];
    const model = buildCalendarViewModel({ entries: [], events, referenceDate: date, filter: 'exams' });
    expect(model.events.map((event) => event.id)).toEqual(['exam']);
    expect(model.upcoming.flat().map((item) => item.id)).toEqual(['exam']);
  });
  it('does not label past events as upcoming', () => {
    const date = new Date(); date.setDate(date.getDate() - 1);
    const model = buildCalendarViewModel({ entries: [], events: [{ id: 'past', type: 'parcial', title: 'Pasado', starts_at: date.toISOString() }] as Event[], referenceDate: date, filter: 'all' });
    expect(model.upcoming).toEqual([]);
  });
});
