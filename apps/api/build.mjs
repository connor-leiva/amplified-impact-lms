// Bundle the API for production.
//
// `@ai/core` ships TypeScript source (the web app aliases straight to it, and the differential
// tests import it directly), so Node cannot load it at runtime. Rather than emit a second JS copy
// of core with its own module-resolution problems, the API is bundled: workspace packages are
// inlined, real dependencies stay external and are installed normally.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// Everything published to npm stays external; only our own workspace packages get inlined.
const external = Object.keys(pkg.dependencies ?? {}).filter((d) => !d.startsWith('@ai/'));

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  external,
  logLevel: 'info',
});
