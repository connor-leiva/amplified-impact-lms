import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const app = Fastify({ logger: true });

app.get('/api/health', async () => ({ ok: true, version: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev' }));

// In the demo environment the API serves only the SPA and /api/health: no database, no routes.
// Phase 07 registers auth, snapshot, mutate, files, events and jobs behind this guard.
const fixtureOnly = process.env.VITE_DATA_SOURCE === 'fixture';
if (!fixtureOnly) {
  // registered in phase 07
}

const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist, wildcard: false });
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith('/api/') ? reply.code(404).send({ error: 'Not found' }) : reply.sendFile('index.html'),
  );
}

await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });
