// Bundles the harness: harness/public/index.html + app.js + app.css. `node harness/build.mjs`
import { build } from 'esbuild';
import { cpSync } from 'node:fs';
// the page's logo files, served beside the harness as they are beside the mockup
cpSync(new URL('../mockup/logos', import.meta.url).pathname, new URL('./public/logos', import.meta.url).pathname, { recursive: true });
await build({
  entryPoints: [new URL('./main.jsx', import.meta.url).pathname],
  bundle: true, outfile: new URL('./public/app.js', import.meta.url).pathname,
  jsx: 'automatic', loader: { '.js': 'jsx' }, format: 'esm', minify: false, sourcemap: false,
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info',
});
