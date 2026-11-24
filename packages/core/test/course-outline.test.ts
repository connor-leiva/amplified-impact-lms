import { describe, expect, it } from 'vitest';
import { courseFor, courseOutline, isLockedWeek } from '../src/course';
import { seedProduction } from '../seed/curriculum';

// D-241: a $37 skill buyer's locked preview of the AI Accelerator is the course as the outline shows a locked week.
describe('courseOutline', () => {
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });

  it('is every week as a learner sees one that has not opened: its title, question and outcome, none of its content', () => {
    const outline = courseOutline(db)!;
    const staff = courseFor(db, Date.now(), 'staff')!;
    expect(outline.map((w) => w.week)).toEqual(staff.weeks.map((w) => w.week));
    expect(outline.map((w) => w.title)).toEqual(staff.weeks.map((w) => w.title));
    for (const w of outline) {
      expect(isLockedWeek(w)).toBe(true);
      expect(Object.keys(w).sort()).toEqual(expect.arrayContaining(['locked', 'opensAt', 'outcome', 'question', 'title', 'week']));
      expect(w).not.toHaveProperty('steps');
      expect(w).not.toHaveProperty('kit');
    }
  });

  it('is nothing when the database holds no course', () => {
    expect(courseOutline({ cohorts: [], modules: [] })).toBeNull();
  });
});
