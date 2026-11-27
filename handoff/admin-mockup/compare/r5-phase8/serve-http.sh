#!/bin/bash
# R-5 Phase 8 (D-269): a fresh database the deploy's way (migrations, the demo seed), then `serve-http.ts` on :4391.
# Run from the repository root, after `pnpm --filter @ai/web build`.
set -e
BASE=${PG:-postgres://postgres:postgres@localhost:5432}
psql "$BASE/postgres" -q -c 'drop database if exists ai_lms_p8_shots' -c 'create database ai_lms_p8_shots'
export DATABASE_URL="$BASE/ai_lms_p8_shots"
pnpm --filter @ai/api db:migrate
pnpm --filter @ai/api db:seed
mkdir -p compliance/test-results
cd apps/api && NODE_ENV=test FIXED_NOW=2026-12-10T16:30:00.000Z npx tsx ../../handoff/admin-mockup/compare/r5-phase8/serve-http.ts
