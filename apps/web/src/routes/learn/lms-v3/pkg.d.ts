// D-225: `@lms-v3-pkg/*` is the package's own JSX (`handoff/lms-v3/src/`), which the equality tests render beside the
// repo's TSX. It has no types of its own, and the tests only compare what the two render.
declare module '@lms-v3-pkg/*';
