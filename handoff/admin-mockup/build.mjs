import { build } from '/home/claude/wk/pkg/node_modules/esbuild/lib/main.js';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ stdin: { contents: `import React from 'react';import { createRoot } from 'react-dom/client';import M from './AdminMock.jsx';createRoot(document.getElementById('root')).render(React.createElement(M));`, resolveDir: '/home/claude/wk/admin', loader: 'jsx' },
  bundle: true, write: false, minify: true, loader: { '.jsx': 'jsx', '.svg': 'dataurl' }, nodePaths: ['/home/claude/wk/pkg/node_modules'], define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
writeFileSync('/home/claude/wk/admin/dist/index.html', `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admin portal: intake responses, Turned in and GHL (mockup)</title><style>
@font-face{font-family:'Geist';font-style:normal;font-weight:100 900;font-display:swap;src:url('fonts/geist-latin-wght-normal.woff2') format('woff2')}
@font-face{font-family:'Geist Mono';font-style:normal;font-weight:100 900;font-display:swap;src:url('fonts/geist-mono-latin-wght-normal.woff2') format('woff2')}
html,body{margin:0;height:100%}#root{height:100%}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log('dist/index.html', Math.round(js.length / 1024) + ' KB');
