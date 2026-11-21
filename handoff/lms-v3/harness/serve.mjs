// Tiny static server: /harness/* -> harness/public, /mockup/* -> mockup/.
// `node harness/serve.mjs [port]` then open http://localhost:4178/harness/
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const ROOTS = { harness: join(here, 'public'), mockup: process.env.MOCKUP_DIR || join(here, '../mockup') };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.vtt': 'text/vtt' };
export function serve(port = 4178) {
  const srv = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const [, root, ...rest] = url.split('/');
    const base = ROOTS[root]; if (!base) { res.writeHead(404); return res.end(); }
    let p = normalize(join(base, rest.join('/') || 'index.html'));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!p.startsWith(base) || !existsSync(p)) { res.writeHead(404); return res.end(); }
    const size = statSync(p).size, type = TYPES[extname(p)] || 'application/octet-stream';
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const s = range[1] ? +range[1] : 0, e = range[2] ? +range[2] : size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${s}-${e}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 });
      return createReadStream(p, { start: s, end: e }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    createReadStream(p).pipe(res);
  });
  return new Promise((r) => srv.listen(port, () => r(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const port = +(process.argv[2] || 4178); await serve(port); console.log(`http://localhost:${port}/harness/  ·  http://localhost:${port}/mockup/index.html`); }
