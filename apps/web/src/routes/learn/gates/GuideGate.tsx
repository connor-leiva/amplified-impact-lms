// `/skill-library/:slug`, with the flag on (D-182): the skill's page in the learner portal
// (/learn/skills/:slug) for a learner with the course, and the first guide page (`SkillGuide`, D-151) for
// everyone else, signed out included (it sends them to sign in and back itself), as `main` serves it.
// D-257: with LMS v3 on, every signed-in learner goes to /learn/skills/:slug (`learnsInLms`).

import { useEffect } from 'react';
import { Component as SkillGuide } from '../../library/SkillGuide';
import { BrandSlot } from '../../../shell/BrandSlot';
import { Icon } from '../../../components/Icon';
import s from '../../library/SkillGuide.module.css';
import { learnsInLms, useLearnerAudience } from '../audience';
import { LibraryRedirect } from '../redirects';

/** Shown while we learn who is reading, so the guide never paints a blank page. */
function Pending() {
  useEffect(() => {
    document.body.dataset.appReady = 'true';
  }, []);
  return (
    <main className={s.page}>
      <header className={s.head}>
        <BrandSlot kind="lockup" />
      </header>
      <p className={s.status} role="status" aria-busy="true">
        <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} label="Loading the guided setup" />
        Loading the guided setup
      </p>
    </main>
  );
}

export function Component() {
  const audience = useLearnerAudience();
  if (audience === null) return <Pending />;
  return learnsInLms(audience) ? <LibraryRedirect /> : <SkillGuide />;
}

export default Component;
