#!/bin/bash
# R-5 Phase 9 (D-270): a fresh database the deploy's way (migrations, § 9.5's launch seed and every data step: production's
# shape, December's nine weeks and its sessions), then `serve-http.ts` on :4391.
# Run from the repository root, after `pnpm --filter @ai/web build`.
set -e
BASE=${PG:-postgres://postgres:postgres@localhost:5432}
psql "$BASE/postgres" -q -c 'drop database if exists ai_lms_p9_shots' -c 'create database ai_lms_p9_shots'
export DATABASE_URL="$BASE/ai_lms_p9_shots"
pnpm --filter @ai/api db:migrate
pnpm --filter @ai/api db:seed:prod --owner-name 'Connor Leiva' --owner-email owner@example.test
mkdir -p compliance/test-results
cd apps/api && NODE_ENV=test FIXED_NOW=2026-12-10T16:30:00.000Z npx tsx ../../handoff/admin-mockup/compare/r5-phase9/serve-http.ts
