import { describe, expect, it } from 'vitest';
import { landingPath, safeLanding, safeNext, SKILL_LIBRARY_PATH } from './landing';
import { seed } from './seed';
import { ACCELERATOR_MODULE_IDS, isAcceleratorModule } from './accelerator';
import { visibleModules } from './status';

// D-150: where each sign-in lands. The prototype's learners all have AI Employees, so they keep `/`;
// a learner whose plan opens none (the course dropped, D-110) lands on the Skill Library.

describe('landingPath', () => {
  const db = seed();
  const learner = db.users[0]!;

  it('keeps `/` for a learner with a portal, and for staff', () => {
    expect(visibleModules(db).length).toBeGreaterThan(0);
    expect(landingPath(db, { kind: 'learner', userId: learner.id })).toBe('/');
    expect(landingPath(db, { kind: 'staff', staffId: db.staff[0]!.id })).toBe('/');
  });

  it('sends a learner whose snapshot holds no AI Employee to the Skill Library', () => {
    // Only the course's AI Employees: dropped for a plan without the AI Accelerator (D-110), kept with it.
    const onlyCourse = { ...db, modules: db.modules.slice(0, ACCELERATOR_MODULE_IDS.length).map((m, i) => ({ ...m, id: ACCELERATOR_MODULE_IDS[i]! })) };
    expect(onlyCourse.modules.every((m) => isAcceleratorModule(m.id))).toBe(true);
    expect(landingPath(onlyCourse, { kind: 'learner', userId: learner.id }, { accelerator: false })).toBe(SKILL_LIBRARY_PATH);
    expect(landingPath(onlyCourse, { kind: 'learner', userId: learner.id }, { accelerator: true })).toBe('/');
    // No AI Employee at all: the same.
    expect(landingPath({ ...db, modules: [] }, { kind: 'learner', userId: learner.id })).toBe(SKILL_LIBRARY_PATH);
  });

  it('sends a learner who is not in the database to the Skill Library, never into the portal', () => {
    expect(landingPath(db, { kind: 'learner', userId: 'nobody' })).toBe(SKILL_LIBRARY_PATH);
  });
});

describe('safeLanding', () => {
  it('passes the two landings through and reads anything else as `/`', () => {
    expect(safeLanding('/')).toBe('/');
    expect(safeLanding('/skill-library')).toBe('/skill-library');
    for (const bad of ['https://evil.example.com', '//evil.example.com', '/admin', '/skill-library/../admin', undefined, null, 42]) {
      expect(safeLanding(bad)).toBe('/');
    }
  });
});

describe('safeNext (D-151)', () => {
  it('passes a skill’s page in the learner portal too (D-182), by the same pages', () => {
    expect(safeNext('/learn/skills/appointment-follow-up')).toBe('/learn/skills/appointment-follow-up');
    expect(safeNext('/learn/skills/content-strategist')).toBe('/learn/skills/content-strategist');
    for (const bad of ['/learn/skills', '/learn/skills/', '/learn/skills/not-a-skill', '/learn/skills/../admin', '/learn/skills/perfect-week/x', '/learn', '/learn/week/1']) {
      expect(safeNext(bad), bad).toBeNull();
    }
  });

  it('passes a guided setup in learn, and nothing else', () => {
    expect(safeNext('/skill-library/appointment-follow-up')).toBe('/skill-library/appointment-follow-up');
    expect(safeNext('/skill-library/content-strategist')).toBe('/skill-library/content-strategist');
    expect(safeNext('/skill-library/month-end-close')).toBe('/skill-library/month-end-close');
    for (const bad of [
      '/skill-library',
      '/skill-library/',
      '/skill-library/not-a-skill',
      '/skill-library/content-opportunity-research', // the id, not the page
      '/skill-library/../admin',
      '/skill-library/appointment-follow-up?x=1',
      '/skill-library/appointment-follow-up/extra',
      'https://evil.example.com/skill-library/perfect-week',
      '//evil.example.com',
      '/admin',
      undefined,
      42,
    ]) {
      expect(safeNext(bad), String(bad)).toBeNull();
    }
  });
});
