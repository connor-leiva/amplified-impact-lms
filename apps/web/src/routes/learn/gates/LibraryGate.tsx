// `/skill-library`, with the flag on (D-182): the learner portal's Skill Library (/learn/skills) for a
// learner with the course, and the standalone Skill Library (D-079) for everyone else, signed out
// included, exactly as `main` serves it: the access group's welcome and its Dismiss, the "Included with
// your … team" line, and each skill's Download and Setup Guide.
// D-257: with LMS v3 on, every signed-in learner goes to /learn/skills, where a learner without the course finds this
// same page inside the v3 frame (`learnsInLms`). A signed-out visitor and staff get it here, as today.

import { Component as SkillLibrary } from '../../library/SkillLibrary';
import { learnsInLms, useLearnerAudience } from '../audience';
import { LibraryRedirect } from '../redirects';

export function Component() {
  const audience = useLearnerAudience();
  if (audience === null) return null;
  return learnsInLms(audience) ? <LibraryRedirect /> : <SkillLibrary />;
}

export default Component;
