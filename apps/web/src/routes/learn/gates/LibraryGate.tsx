// `/skill-library`, with the flag on (D-182): the learner portal's Skill Library (/learn/skills) for a
// learner with the course, and the standalone Skill Library (D-079) for everyone else, signed out
// included, exactly as `main` serves it: the access group's welcome and its Dismiss, the "Included with
// your … access" line, and each skill's Download and Setup Guide.

import { Component as SkillLibrary } from '../../library/SkillLibrary';
import { useAudience } from '../audience';
import { LibraryRedirect } from '../redirects';

export function Component() {
  const audience = useAudience();
  if (audience === null) return null;
  return audience === 'course' ? <LibraryRedirect /> : <SkillLibrary />;
}

export default Component;
