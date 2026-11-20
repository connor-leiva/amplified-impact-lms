// D-220, D-221: course fields that held seed words no learner page draws and the builder never showed.
// Nothing writes them now: the seed leaves them out, a builder save drops them (`saveBuilderModule`), and
// one-time data steps cleared the stored ones. Their keys stay in the types, marked retired, so an older
// draft still parses.

import type { ModuleCourse } from './course-types';
import type { AIEmployee } from './types';

/** A course without its retired fields: the promise, the old setup order and each kit skill's use line. */
export function courseWithoutRetired<C extends ModuleCourse>(c: C): C {
  if (!hasRetired(c)) return c;
  const { promise: _p, setup: _s, ...rest } = c;
  return { ...rest, skills: (c.skills ?? []).map(({ use: _u, ...k }) => k) } as C;
}

/** A module without its course's retired fields. Everything else is the same object. */
export function withoutRetired(m: AIEmployee): AIEmployee {
  return m.course && hasRetired(m.course) ? { ...m, course: courseWithoutRetired(m.course) } : m;
}

export function hasRetired(c: ModuleCourse): boolean {
  return c.promise !== undefined || c.setup !== undefined || (c.skills ?? []).some((k) => k.use !== undefined);
}
