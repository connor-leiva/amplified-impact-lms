// `/skill-library/:slug`, with the flag on (D-182): the skill's page in the learner portal
// (/learn/skills/:slug) for a learner with the course, and the first guide page (`SkillGuide`, D-151) for
// everyone else, signed out included (it sends them to sign in and back itself), as `main` serves it.

import { Component as SkillGuide } from '../../library/SkillGuide';
import { useAudience } from '../audience';
import { LibraryRedirect } from '../redirects';

export function Component() {
  const audience = useAudience();
  if (audience === null) return null;
  return audience === 'course' ? <LibraryRedirect /> : <SkillGuide />;
}

export default Component;
