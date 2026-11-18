// `/course` and `/course/:week`, with the flag on (D-182): the learner portal's Home or week for a learner
// with the course, and the first course pages (D-110) for everyone else, as `main` serves them.

import { Component as Course } from '../../course/Course';
import { useAudience } from '../audience';
import { CourseRedirect } from '../redirects';

export function Component() {
  const audience = useAudience();
  if (audience === null) return null;
  return audience === 'course' ? <CourseRedirect /> : <Course />;
}

export default Component;
