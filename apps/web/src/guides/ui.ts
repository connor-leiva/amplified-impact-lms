// What a guide page's script needs at runtime, and nothing else: `main.ts` imports only this file, so
// no guide's copy ends up in the inlined script. The messages are the API's own (`WAITLIST_ERRORS` in
// apps/api/src/routes/ai101.ts), so a refusal from either side reads the same. The copy messages are
// /ai101's (`UI.chipCopyFailed`, `UI.toastMs`), so a failed copy reads the same on every page.

export const UI = {
  errors: {
    firstName: 'Enter your first name.',
    email: 'Enter a valid email address.',
    generic: 'Something went wrong. Try again.',
  },
  copyFailed: "Couldn't copy automatically. The words are selected: copy them from your device's menu.",
  /** How long the toast stays up. */
  toastMs: 3200,
} as const;
