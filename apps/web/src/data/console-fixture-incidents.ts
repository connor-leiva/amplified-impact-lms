// The Admin Console's fixture for Incidents (D-167). FIXTURE ONLY: only `console-fixture.ts` imports
// this, and `console.ts` loads that behind `VITE_DATA_SOURCE`, so the http build has none of it
// (`console-build.test.ts`).
//
// The records are AdminRedesign.jsx's own `INCIDENTS` (`parity-r2.ts`), turned into the API's shapes
// (`@ai/core` console-incidents.ts) so the view-models print the mockup's words from what the API
// answers: "Acknowledged by Avery Stone." is an `acknowledged` line by Avery Stone, "Opened by Connor
// Leiva." an `opened` line by him, and the mockup's other sentences are the lines' own words. Its
// "Linked" rows are the lines' links. Its owners are the mockup's, as the API would name them.

import { CONSOLE_ERRORS, CONSOLE_PAGE_DEFAULT, INCIDENT_LINKS, incidentOwner } from '@ai/core';
import type { ConsolePage, IncidentDetail, IncidentEventView, IncidentFilters, IncidentPerson, IncidentRow, IncidentSeverity, IncidentStatus } from '@ai/core';
import { ConsoleError } from './console';
import { INCIDENTS, STAFF, mockStamp } from './parity-r2';

const SEVERITY: Record<string, IncidentSeverity> = { 'Sev 1': 'sev1', 'Sev 2': 'sev2', 'Sev 3': 'sev3' };
const STATUS: Record<string, IncidentStatus> = { Open: 'open', Acknowledged: 'acknowledged', Resolved: 'resolved' };

/** The mockup's staff, by name, with an id the fixture makes up. */
export const fixturePerson = (name: string): IncidentPerson => ({ id: `st_${name.split(' ')[0]!.toLowerCase()}`, name });

/** A "Linked" row of the mockup as the link its line carries. */
function linkOf([screen, label]: readonly [string, string]): string {
  if (screen === 'jobs') return `${INCIDENT_LINKS.jobs}?job=${encodeURIComponent(label.replace(/^Job /, ''))}`;
  if (screen === 'email') return `${INCIDENT_LINKS.email}?template=${encodeURIComponent(label.replace(/^Email log, /, ''))}`;
  return `${INCIDENT_LINKS.webhooks}?n=${parseInt(label, 10)}`;
}

const BY = /^(Opened|Acknowledged|Resolved) by (.+)\.$/;

function detailOf(i: (typeof INCIDENTS)[number]): IncidentDetail {
  const links = i.links.map(linkOf);
  const events: IncidentEventView[] = i.tl.map(([when, text], n) => {
    const m = BY.exec(text);
    const kind = m ? (m[1]!.toLowerCase() as 'opened' | 'acknowledged' | 'resolved') : n === 0 ? 'opened' : 'note';
    return { id: `${i.id}-${n + 1}`, at: mockStamp(when), kind, actor: m ? fixturePerson(m[2]!) : null, body: m ? null : text, link: links[n] ?? null };
  });
  const by = (kind: string) => events.find((e) => e.kind === kind) ?? null;
  return {
    id: i.id,
    title: i.t,
    severity: SEVERITY[i.sev]!,
    status: STATUS[i.st]!,
    owner: fixturePerson(i.own),
    openedAt: mockStamp(i.o),
    fingerprint: events[0]!.actor ? null : `fixture:${i.id}`,
    openedBy: events[0]!.actor,
    acknowledgedAt: by('acknowledged')?.at ?? null,
    acknowledgedBy: by('acknowledged')?.actor ?? null,
    resolvedAt: by('resolved')?.at ?? null,
    resolvedBy: by('resolved')?.actor ?? null,
    events,
  };
}

/** The mockup's three incidents, newest first. */
export const fixtureIncidents = (): IncidentDetail[] => INCIDENTS.map(detailOf);

export const rowOf = ({ id, title, severity, status, owner, openedAt }: IncidentDetail): IncidentRow => ({ id, title, severity, status, owner, openedAt });

export function fixtureIncidentPage(all: readonly IncidentDetail[], f: IncidentFilters, cursor: string | null | undefined): ConsolePage<IncidentRow> {
  const rows = all.filter((i) => !f.status || i.status === f.status).map(rowOf);
  const start = cursor ? Number(cursor) : 0;
  return { rows: rows.slice(start, start + CONSOLE_PAGE_DEFAULT), nextCursor: start + CONSOLE_PAGE_DEFAULT < rows.length ? String(start + CONSOLE_PAGE_DEFAULT) : null };
}

/** The viewer as the fixture names them: the mockup's Owner in the parity fixture. */
export const FIXTURE_ME: IncidentPerson = fixturePerson(STAFF[0].n);

const stateError = () => new ConsoleError('failed', 409, 'incident_state', CONSOLE_ERRORS.incident_state.message);

/** What the API's ack, resolve and note would leave behind, or its 409. */
export function fixtureIncidentChange(
  i: IncidentDetail,
  what: { kind: 'acknowledged' | 'resolved' | 'note'; body?: string },
  me: IncidentPerson,
  at: number,
): IncidentDetail {
  if (what.kind === 'acknowledged' && i.status !== 'open') throw stateError();
  if (what.kind === 'resolved' && i.status === 'resolved') throw stateError();
  const line: IncidentEventView = { id: `${i.id}-${i.events.length + 1}`, at, kind: what.kind, actor: me, body: what.body ?? null, link: null };
  const next = { ...i, events: [...i.events, line] };
  if (what.kind === 'acknowledged') return { ...next, status: 'acknowledged', acknowledgedAt: at, acknowledgedBy: me, owner: me };
  if (what.kind === 'resolved') {
    const done = { ...next, status: 'resolved' as const, resolvedAt: at, resolvedBy: me };
    return { ...done, owner: incidentOwner(done) };
  }
  return next;
}
