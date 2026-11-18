import { ics } from '@ai/core';
import type { IcsEvent } from '@ai/core';

// "Add to calendar" on the learner screens (D-177): an .ics written in the browser from the course's own
// sessions, as the portal's Add to Calendar does (`ics()` in @ai/core). Never a join link: only the join
// route hands that out, inside its window.

export function saveIcs(events: readonly IcsEvent[], now: number, name = 'amplified-impact-sessions.ics'): void {
  if (!events.length) return;
  const url = URL.createObjectURL(new Blob([ics(events, now)], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
