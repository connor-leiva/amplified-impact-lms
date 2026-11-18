// "Add to calendar" beside the .ics: a Google Calendar and an Outlook link for one event (SCREENS § 5.4's
// calendar menu). Moved here from `routes/portal/Dashboard.vm.ts` unchanged (D-183), so the current
// portal's Session Card and the learner portal v2 build the same links. Pure.

/** The UTC basic format a Google Calendar template link wants. */
export const gcalStamp = (t: number): string =>
  new Date(t)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

export interface CalLinkEvent {
  title: string;
  start: number;
  end: number;
  /** The event's details. The learner portal v2 sends none: no join link ever goes in a calendar. */
  url?: string;
}

/** The event as a Google Calendar template link and an Outlook compose link, each opened in a new tab. */
export function calLinks(event: CalLinkEvent): { google: string; outlook: string } {
  const url = event.url ?? '';
  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${gcalStamp(event.start)}/${gcalStamp(event.end)}&details=${encodeURIComponent(url)}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${new Date(event.start).toISOString()}&enddt=${new Date(event.end).toISOString()}&body=${encodeURIComponent(url)}`,
  };
}
