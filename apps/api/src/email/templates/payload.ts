// What each of § 8.1's nine emails actually needs, as types and nothing else.
//
// ================================================================================================
// WHY THIS IS ITS OWN FILE, AND WHY IT IS HERE RATHER THAN IN `transport.ts`
// ================================================================================================
//
// `transport.ts`'s `EmailData<K>` used to be `SubjectData[K] & Record<string, unknown>`, and its
// own comment named that as "the one line to tighten" once the template payload types landed. They
// have landed — and tightening it means the transport has to NAME the per-template payload type,
// which means `transport.ts` and `templates/index.tsx` both need it.
//
// Putting it in `index.tsx` would make `transport.ts` import the module that imports the transport:
// a cycle. It would be a cycle of *types* only — `verbatimModuleSyntax` erases
// `import type`, so nothing would load at runtime — but it would also put the entire React Email
// renderer (`@react-email/render`, every component, `react`) on the far side of an import in a
// module whose decision 3 is precisely that it drags no renderer in with it. Putting it in
// `transport.ts` instead would make the transport the owner of every template's body fields, which
// `subjects.ts` and `index.tsx` both explicitly say it is not ("that larger type belongs with the
// templates").
//
// So the types live in a LEAF module under `templates/`: owned by the templates, importable by the
// transport, and importing nothing but `../subjects` (which imports nothing at all). There is no
// cycle in either direction and no runtime edge at all — this file emits no JavaScript.
//
// `index.tsx` re-exports both names, so every existing caller still imports them from
// `./templates`.

import type { SubjectData, TemplateName } from '../subjects';

/**
 * What each template's BODY needs, on top of what its subject needs (`SubjectData`).
 *
 * `appUrl` is optional everywhere: `links.appBase` falls back to `process.env.APP_URL`, which is
 * the variable phase 07 § 7.5 already names. A caller that knows the origin may override it.
 */
export interface BodyData {
  'sign-in': { token: string; next?: string | null; appUrl?: string | null };
  'set-password': { token: string; appUrl?: string | null };
  'reset-password': { token: string; appUrl?: string | null };
  'team-invite': { token: string; appUrl?: string | null };
  'staff-invite': { token: string; appUrl?: string | null };
  announcement: {
    body: string;
    action?: 'calendar' | 'sessions' | null;
    actionLabel?: string;
    appUrl?: string | null;
  };
  /** `start` is the session instant; `zone` is the RECIPIENT's saved `prefs.tz` (§ 8.1). */
  'session-24h': { start: number; zone?: string | null; appUrl?: string | null };
  'session-1h': { start: number; zone?: string | null; appUrl?: string | null };
  'replay-ready': { employee: string; moduleId: string; appUrl?: string | null };
  'build-reminder': { moduleId: string; steps: number; total?: number; appUrl?: string | null };
  /** `before`: the day to review before. Absent: Thursday, the prototype's. The AI Accelerator's is its build day (D-110). */
  'weekly-digest': { appUrl?: string | null; before?: string };
  'skill-purchase': {
    sets: 'owner_ops' | 'agent' | 'both';
    firstName: string;
    next: string;
    token?: string | null;
    appUrl?: string | null;
  };
  /** D-247: `email` is the address they sign in with; `token` a `set_password` one (72 hours). */
  'learner-invite': { firstName: string; email: string; token: string; appUrl?: string | null };
  'learner-nudge': { firstName: string; appUrl?: string | null };
}

/**
 * The whole payload for one send: § 8.1's subject fields plus that template's body fields.
 *
 * This is the type `transport.ts`'s `EmailData<K>` now IS, which is what makes a payload that
 * carries only the subject fields a compile error at the call site rather than a `template render
 * threw: …` in the log and an email nobody receives. Phase 08's § 8.5 scheduler shipped three such
 * payloads past a green `tsc --noEmit` precisely because the transport accepted anything.
 *
 * WHY THE BODY HALF IS WRITTEN AS A MAPPED TYPE RATHER THAN A PLAIN `& BodyData[K]`. The two are
 * the same type — a homomorphic mapped type preserves every property and its optional modifier —
 * but they differ in one assignability rule that this seam depends on. TypeScript grants an
 * implicit index signature only to a RESOLVED object type, so with `K` still generic
 * `SubjectData[K] & BodyData[K]` is not assignable to `Record<string, unknown>`, and the
 * `TemplateRenderer` seam in `transport.ts` would stop accepting the templates module's own
 * non-generic `renderTemplate` — i.e. `setRenderer(renderTemplate)` would fail to compile in the
 * deferred Fastify app, which is exactly what `_rendererFits` in `./index.tsx` exists to catch.
 * Mapping the body half flattens it enough to earn that index signature, while leaving
 * `SubjectData[K]` intact as its own intersection member so `subjectFor(template, data)` still
 * typechecks inside `send`. Both halves of that are load-bearing; changing either one back breaks
 * a different call.
 */
export type EmailPayload<K extends TemplateName> = SubjectData[K] & {
  [F in keyof BodyData[K]]: BodyData[K][F];
};
