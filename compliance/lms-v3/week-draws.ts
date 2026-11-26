// LMS v3 rollout (Phase 11, D-257): which open weeks keep today's page because their Media holds a real video, for a
// course as the API sends it to a learner. READ ONLY: it reads a saved `GET /api/course` answer and writes nothing.
//
//   node compliance/step-page-v6/signin.mjs <origin> auth.json          (SEED_TEST_MEMBER_EMAIL / _PASSWORD)
//   node compliance/lms-v3/get-course.mjs <origin> auth.json course.json   (one GET)
//   pnpm --filter @ai/api exec tsx ../../compliance/lms-v3/week-draws.ts "$PWD/course.json"
//
// The check is `v3WeekDraws`'s media half (apps/web/src/routes/learn/lms-v3/week.vm.ts; IMPLEMENTATION-SPEC.md §4.D,
// C-12, D-234, D-252): every Media item is a placeholder line (a string) or Week 0's pinned LMS tour. The rule's other
// half (a sample output, seat card or playbook card part Reference has no block for) is listed by name only.
import { readFileSync } from 'node:fs';
import { isPinnedTour } from '../../packages/core/src/lms-tour';

interface Week {
  week: number;
  title: string;
  open?: boolean;
  media?: unknown[];
  sampleOutput?: unknown;
  seatCard?: unknown;
  playbookCard?: unknown;
}

const file = process.argv[2];
if (!file) throw new Error('Usage: week-draws.ts <course.json> (a saved GET /api/course answer)');
const payload = JSON.parse(readFileSync(file, 'utf8')) as { course?: { weeks?: Week[] } };
for (const w of payload.course?.weeks ?? []) {
  if (!Array.isArray(w.media)) {
    console.log(`Week ${w.week} · ${w.title}: locked, so v3 draws the locked week page`);
    continue;
  }
  const videos = w.media.filter((m) => typeof m !== 'string' && !isPinnedTour(w.week, m as never));
  const cards = ['sampleOutput', 'seatCard', 'playbookCard'].filter((k) => w[k as keyof Week]);
  const said = videos.length
    ? `keeps today's page: ${videos.length} video(s) in Media: ${videos.map((m) => JSON.stringify(m).slice(0, 160)).join(' | ')}`
    : 'Media passes (placeholders or the pinned tour only)';
  console.log(`Week ${w.week} · ${w.title}: ${said}${cards.length ? `; also has ${cards.join(', ')} (drawn as Reference unless a part has no block)` : ''}`);
}
