// Railway Infrastructure as Code. The deprecated single-service railway.json/.toml is not used.
// Apply with: railway config plan  →  review  →  railway config apply
// Phase 09 completes this (staging + demo environments, Postgres, bucket, domains, secrets).
import { defineRailway, project, service, github } from 'railway/iac';

export default defineRailway(() => {
  const web = service('web', {
    source: github('YOUR_ORG/amplified-impact-lms', { branch: 'main' }),
    build: 'pnpm build',
    start: 'pnpm start',
    healthcheck: '/api/health',
    healthcheckTimeout: 60,
    env: { NODE_ENV: 'production' },
  });
  return project('amplified-impact-lms', { resources: [web] });
});

// After the first apply, turn on "Wait for CI" in the web service settings so Railway holds each
// main deployment until the GitHub Actions workflows on that commit pass, and skips it if one fails.
