// § 8.1's nine templates, and the renderer `transport.ts` describes as "the seam for
// apps/api/src/email/templates/".
//
// `transport.setRenderer` takes a `TemplateRenderer`:
//   `(template, data) => { subject, html }`
// and then uses the `html` from it while taking the subject from `SUBJECTS` itself, so the subject
// table stays the single source of truth for what reaches an inbox. `renderTemplate` below honours
// that by building its own subject from `SUBJECTS` too — the same call, not a copy of the strings —
// which is also what puts the exact subject into the `<title>`, the preheader and the H1
// (see `EmailLayout`).
//
// ------------------------------------------------------------------------------------------------
// WHY `elementFor` IS SYNCHRONOUS AND SEPARATE FROM THE RENDER
// ------------------------------------------------------------------------------------------------
// `render()` is async and streams, so component bodies run across microtask boundaries. Anything
// that depends on mutable module state — and `fmt`'s viewer zone is exactly that — must therefore
// be resolved BEFORE the render begins, or a concurrent render can change it mid-flight and a
// learner is told the wrong hour with nothing thrown. `elementFor` is that synchronous phase:
// it validates the payload, builds the subject, formats every instant through `whenFor`, and hands
// back a finished element tree. `recipient.ts` has the full argument.
//
// ------------------------------------------------------------------------------------------------
// WHY THE PAYLOAD IS READ FIELD BY FIELD INSTEAD OF CAST
// ------------------------------------------------------------------------------------------------
// `renderTemplate` is the UNTYPED door: `transport.send` hands it the payload as a
// `Record<string, unknown>` that has already crossed a generic boundary, so inside this module
// nothing is known about the body fields. The usual answer is a cast, which converts a mis-wired
// caller into `undefined` rendered into an inbox — "Finish your undefined", or a button whose href
// is the string "undefined".
//
// So each arm reads its fields through `str`/`num` below, which throw with the template name and
// the field name. `transport.send` catches that (`template render threw: …`), logs it and reports
// `{ok: false}` WITHOUT sending, which is the right outcome: an email nobody can act on is worse
// than a send that visibly failed.
//
// Static typing is the other half of that defence and not a substitute for it. `transport.ts`'s
// `EmailData<K>` is now `EmailPayload<K>` (see `./payload.ts`), so a call site that omits a body
// field does not compile — which is what the § 8.5 scheduler needed and did not have: three of its
// five payloads shipped past a green `tsc --noEmit` and would have thrown here, at send time, on a
// live cohort. The runtime reads stay, because a payload can also arrive from a database row or a
// JSON body, where no compiler was present. `renderEmail` is the typed door onto the same code.

import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { SUBJECTS, TEMPLATE_NAMES } from '../subjects';
import type { TemplateName } from '../subjects';
import type { RenderedEmail, TemplateRenderer } from '../transport';
import type { EmailPayload } from './payload';
import { AnnouncementEmail } from './announcement';
import { BuildReminderEmail } from './build-reminder';
import { ReplayReadyEmail } from './replay-ready';
import { Session1hEmail } from './session-1h';
import { Session24hEmail } from './session-24h';
import { ResetPasswordEmail } from './reset-password';
import { SetPasswordEmail } from './set-password';
import { SignInEmail } from './sign-in';
import { StaffInviteEmail } from './staff-invite';
import { TeamInviteEmail } from './team-invite';
import { WeeklyDigestEmail } from './weekly-digest';
import { whenFor } from './recipient';

export { CONTENT_WIDTH, EmailLayout, Para } from './layout';
export { ROUTES, absolute, appBase, employeePath, invitePath, setPasswordPath, signInPath } from './links';
export { whenFor, zoneFor } from './recipient';
export type { RecipientZone } from './recipient';

// `BodyData` and `EmailPayload` live in `./payload.ts` — a leaf module with no runtime imports — so
// that `transport.ts` can name the payload type without importing this module, and therefore
// without the React Email renderer. Re-exported here so every caller still has one import.
export type { BodyData, EmailPayload } from './payload';

// --- payload reading ---------------------------------------------------------------------------

const bad = (template: TemplateName, field: string, why: string): Error =>
  new Error(`email template ${template}: "${field}" ${why}`);

/** A required non-empty string. Whitespace-only is empty: it would render as a gap. */
function str(template: TemplateName, data: Record<string, unknown>, field: string): string {
  const v = data[field];
  if (typeof v !== 'string') throw bad(template, field, `must be a string, got ${typeof v}`);
  if (!v.trim()) throw bad(template, field, 'is empty');
  return v;
}

/** A required finite number. `NaN` is the realistic failure — a `Date.parse` of a bad instant. */
function num(template: TemplateName, data: Record<string, unknown>, field: string): number {
  const v = data[field];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw bad(template, field, `must be a finite number, got ${JSON.stringify(v)}`);
  }
  return v;
}

/** An optional string: absent, `null` and `''` all mean "not given". */
function optStr(data: Record<string, unknown>, field: string): string | undefined {
  const v = data[field];
  return typeof v === 'string' && v !== '' ? v : undefined;
}

/** An optional positive integer, for `build-reminder`'s `total`. */
function optCount(template: TemplateName, data: Record<string, unknown>, field: string): number | undefined {
  const v = data[field];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) {
    throw bad(template, field, `must be a positive integer, got ${JSON.stringify(v)}`);
  }
  return v;
}

// --- the registry ------------------------------------------------------------------------------

/** What `elementFor` resolves to: the subject § 8.1 specifies, and the tree that renders it. */
export interface PreparedEmail {
  subject: string;
  element: ReactElement;
}

/**
 * The synchronous half of a render: validate, build the subject, format instants, choose a
 * component. One arm per row of § 8.1's table.
 *
 * A `switch` over a `TemplateName` union rather than a lookup object, because each arm needs
 * different fields and a different subject builder; the union makes a missing arm a typecheck
 * failure at the `never` below, and `TEMPLATE_NAMES` is swept in the tests so a tenth template
 * cannot be added without an arm.
 */
export function elementFor(template: TemplateName, data: Record<string, unknown>): PreparedEmail {
  const appUrl = optStr(data, 'appUrl');

  switch (template) {
    case 'sign-in': {
      const token = str(template, data, 'token');
      const subject = SUBJECTS['sign-in']({});
      return { subject, element: <SignInEmail subject={subject} token={token} appUrl={appUrl} /> };
    }

    case 'set-password': {
      const token = str(template, data, 'token');
      const subject = SUBJECTS['set-password']({});
      return { subject, element: <SetPasswordEmail subject={subject} token={token} appUrl={appUrl} /> };
    }

    case 'reset-password': {
      const token = str(template, data, 'token');
      const subject = SUBJECTS['reset-password']({});
      return { subject, element: <ResetPasswordEmail subject={subject} token={token} appUrl={appUrl} /> };
    }

    case 'team-invite': {
      const inviter = str(template, data, 'inviter');
      const team = str(template, data, 'team');
      const token = str(template, data, 'token');
      const subject = SUBJECTS['team-invite']({ inviter, team });
      return {
        subject,
        element: <TeamInviteEmail subject={subject} token={token} appUrl={appUrl} />,
      };
    }

    case 'staff-invite': {
      const token = str(template, data, 'token');
      const subject = SUBJECTS['staff-invite']({});
      return {
        subject,
        element: <StaffInviteEmail subject={subject} token={token} appUrl={appUrl} />,
      };
    }

    case 'announcement': {
      // § 8.1: the subject IS the title. `sendAnnouncement` requires both title and body.
      const title = str(template, data, 'title');
      const body = str(template, data, 'body');
      const rawAction = data['action'];
      const action = rawAction === 'calendar' || rawAction === 'sessions' ? rawAction : null;
      const subject = SUBJECTS.announcement({ title });
      return {
        subject,
        element: (
          <AnnouncementEmail
            subject={subject}
            body={body}
            action={action}
            actionLabel={optStr(data, 'actionLabel') ?? ''}
            appUrl={appUrl}
          />
        ),
      };
    }

    case 'session-24h': {
      const n = num(template, data, 'n');
      const title = str(template, data, 'title');
      const subject = SUBJECTS['session-24h']({ n, title });
      // § 8.1's time rule, resolved here — synchronously, before any render. See recipient.ts.
      const when = whenFor(num(template, data, 'start'), optStr(data, 'zone'));
      return {
        subject,
        element: <Session24hEmail subject={subject} when={when} appUrl={appUrl} />,
      };
    }

    case 'session-1h': {
      const n = num(template, data, 'n');
      const title = str(template, data, 'title');
      const subject = SUBJECTS['session-1h']({ n, title });
      const when = whenFor(num(template, data, 'start'), optStr(data, 'zone'));
      return {
        subject,
        element: <Session1hEmail subject={subject} when={when} appUrl={appUrl} />,
      };
    }

    case 'replay-ready': {
      const n = num(template, data, 'n');
      const title = str(template, data, 'title');
      const employee = str(template, data, 'employee');
      const moduleId = str(template, data, 'moduleId');
      const subject = SUBJECTS['replay-ready']({ n, title });
      return {
        subject,
        element: <ReplayReadyEmail subject={subject} employee={employee} moduleId={moduleId} appUrl={appUrl} />,
      };
    }

    case 'build-reminder': {
      const employee = str(template, data, 'employee');
      const moduleId = str(template, data, 'moduleId');
      // Zero verified steps is the commonest case this email exists for, so `steps` is read with
      // `num` (which accepts 0) and never with a truthiness check.
      const steps = num(template, data, 'steps');
      const subject = SUBJECTS['build-reminder']({ employee });
      return {
        subject,
        element: (
          <BuildReminderEmail
            subject={subject}
            moduleId={moduleId}
            steps={steps}
            total={optCount(template, data, 'total')}
            appUrl={appUrl}
          />
        ),
      };
    }

    case 'weekly-digest': {
      const subject = SUBJECTS['weekly-digest']({});
      return { subject, element: <WeeklyDigestEmail subject={subject} appUrl={appUrl} before={optStr(data, 'before')} /> };
    }

    default: {
      // Unreachable while every `TemplateName` has an arm; this is the line that fails to compile
      // if a tenth name is added to § 8.1's table without a template.
      const exhaustive: never = template;
      throw new Error(`email template ${String(exhaustive)}: no template is registered`);
    }
  }
}

/**
 * The `TemplateRenderer` for `transport.setRenderer`.
 *
 * Non-generic on purpose — `transport.ts` records that a
 * `(template: TemplateName, data: Record<string, unknown>) => Promise<RenderedEmail>` is assignable
 * to the generic seam — so the validation above can do the narrowing that a generic signature would
 * only promise.
 */
export const renderTemplate = async (template: TemplateName, data: Record<string, unknown>): Promise<RenderedEmail> => {
  const { subject, element } = elementFor(template, data);
  return { subject, html: await render(element) };
};

/** `renderTemplate` with the payload typed per template. What the deferred routes and jobs call. */
export function renderEmail<K extends TemplateName>(template: K, data: EmailPayload<K>): Promise<RenderedEmail> {
  return renderTemplate(template, data as Record<string, unknown>);
}

/**
 * Compile-time proof that `renderTemplate` really is assignable to `transport.TemplateRenderer`.
 *
 * It costs one unused module-level binding, which is cheaper than the alternative: the only other
 * place the two sides meet is the `setRenderer(renderTemplate)` call at startup, and that lives in
 * the deferred Fastify app. Without this line a change to either signature would compile cleanly
 * today and fail whenever that app is finally written. `satisfies` would not do the job —
 * `TemplateRenderer` is a generic signature, and it is the assignment that instantiates it.
 */
const _rendererFits: TemplateRenderer = renderTemplate;
void _rendererFits;

/** Every name § 8.1's table defines, re-exported so a caller needs one import. */
export { TEMPLATE_NAMES };
export type { TemplateName, RenderedEmail };
