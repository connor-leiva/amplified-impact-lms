// What a guide page's script needs at runtime, and nothing else: `main.ts` imports only this file, so
// no guide's copy ends up in the inlined script. The messages are the API's own (`WAITLIST_ERRORS` in
// apps/api/src/routes/ai101.ts), so a refusal from either side reads the same.

export const UI = {
  errors: {
    firstName: 'Enter your first name.',
    email: 'Enter a valid email address.',
    generic: 'Something went wrong. Try again.',
  },
} as const;
