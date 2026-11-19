// D-188: an in-memory, S3-compatible bucket on 127.0.0.1, for the file routes' tests.
//
// The routes now READ objects (and the Vault checks an upload with a HEAD) rather than only presigning,
// so a test needs something to answer the real SDK's requests. This answers the four the app makes,
// path-style (`/<bucket>/<key>`), the way Railway's bucket does:
//
//   PUT   stores the body and its `content-type` (what the browser does with a presigned URL)
//   HEAD  200 with `content-length` / `content-type`, or 404
//   GET   200, or 206 for one `Range: bytes=…`, or 404 `NoSuchKey`, or 416 `InvalidRange`
//
// Signatures are not checked: SigV4 is `storage.test.ts`'s subject, and this file is about what the
// routes do with an object. Every request is recorded, so a test can prove which key was read and
// with which Range. Nothing leaves the machine.

import { createServer } from 'node:http';
import type { IncomingMessage, Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface FakeBucket {
  /** `S3_*` for this bucket: point `storage.ts` at it, then `resetS3()`. */
  env: Record<'S3_REGION' | 'S3_ENDPOINT' | 'S3_ACCESS_KEY_ID' | 'S3_SECRET_ACCESS_KEY' | 'S3_BUCKET', string>;
  origin: string;
  objects: Map<string, StoredObject>;
  requests: { method: string; key: string; range: string | undefined; contentType: string | undefined }[];
  /**
   * Answer a GET or HEAD for a key it doesn't hold with `object:<key>` instead of a 404. For the suites
   * that only ask who may read an object (the seed's rows have no object behind them).
   */
  anyKey: boolean;
  put(key: string, body: Buffer | string, contentType: string): void;
  close(): Promise<void>;
}

export const FAKE_BUCKET_NAME = 'ai-lms.production';

const xmlError = (code: string, message: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`;

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const parts: Buffer[] = [];
    req.on('data', (c: Buffer) => parts.push(c));
    req.on('end', () => resolve(Buffer.concat(parts)));
    req.on('error', reject);
  });

/** One `bytes=` range against a size, as S3 resolves it; null when it can't be satisfied. */
function resolveRange(header: string, size: number): [number, number] | null | undefined {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return undefined;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (!n) return null;
    return [Math.max(0, size - n), size - 1];
  }
  const start = Number(m[1]);
  if (start >= size) return null;
  const end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  return [start, end];
}

export async function startFakeBucket(): Promise<FakeBucket> {
  const objects = new Map<string, StoredObject>();
  const requests: FakeBucket['requests'] = [];
  const bucket: Partial<FakeBucket> = { objects, requests, anyKey: false };

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const prefix = `/${FAKE_BUCKET_NAME}/`;
      const key = url.pathname.startsWith(prefix) ? decodeURIComponent(url.pathname.slice(prefix.length)) : '';
      const range = typeof req.headers.range === 'string' ? req.headers.range : undefined;
      requests.push({ method: req.method ?? '', key, range, contentType: req.headers['content-type'] });
      if (!key) {
        res.writeHead(400, { 'content-type': 'application/xml' }).end(xmlError('InvalidRequest', 'No key'));
        return;
      }
      if (req.method === 'PUT') {
        objects.set(key, { body: await readBody(req), contentType: String(req.headers['content-type'] ?? 'application/octet-stream') });
        res.writeHead(200, { etag: '"fake"' }).end();
        return;
      }
      const obj = objects.get(key) ?? (bucket.anyKey ? { body: Buffer.from(`object:${key}`), contentType: 'application/octet-stream' } : undefined);
      if (!obj) {
        if (req.method === 'HEAD') res.writeHead(404).end();
        else res.writeHead(404, { 'content-type': 'application/xml' }).end(xmlError('NoSuchKey', 'The specified key does not exist.'));
        return;
      }
      const size = obj.body.length;
      const base = { 'content-type': obj.contentType, 'accept-ranges': 'bytes', etag: '"fake-etag"', 'last-modified': 'Tue, 08 Dec 2026 19:00:00 GMT' };
      if (req.method === 'HEAD') {
        res.writeHead(200, { ...base, 'content-length': String(size) }).end();
        return;
      }
      const r = range ? resolveRange(range, size) : undefined;
      if (r === null) {
        res.writeHead(416, { 'content-type': 'application/xml' }).end(xmlError('InvalidRange', 'The requested range is not satisfiable'));
        return;
      }
      if (r) {
        const [a, b] = r;
        res.writeHead(206, { ...base, 'content-length': String(b - a + 1), 'content-range': `bytes ${a}-${b}/${size}` }).end(obj.body.subarray(a, b + 1));
        return;
      }
      res.writeHead(200, { ...base, 'content-length': String(size) }).end(obj.body);
    })().catch((err: unknown) => {
      res.writeHead(500).end(String(err));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;
  return Object.assign(bucket, {
    origin,
    env: {
      S3_REGION: 'auto',
      S3_ENDPOINT: origin,
      S3_ACCESS_KEY_ID: 'AKIAEXAMPLEONLY00000',
      S3_SECRET_ACCESS_KEY: 'test-only-hmac-key-material-0000000000',
      S3_BUCKET: FAKE_BUCKET_NAME,
    },
    put(key: string, body: Buffer | string, contentType: string) {
      objects.set(key, { body: Buffer.isBuffer(body) ? body : Buffer.from(body), contentType });
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }) as FakeBucket;
}
