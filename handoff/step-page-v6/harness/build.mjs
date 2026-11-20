// Bundles the harness: harness/public/index.html + app.js + app.css. `node harness/build.mjs`
import { build } from 'esbuild';
await build({
  entryPoints: [new URL('./main.jsx', import.meta.url).pathname],
  bundle: true, outfile: new URL('./public/app.js', import.meta.url).pathname,
  jsx: 'automatic', loader: { '.js': 'jsx' }, format: 'esm', minify: false, sourcemap: false,
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info',
});
