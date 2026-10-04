import { defineConfig } from 'drizzle-kit';

// `db:generate` writes migrations into ./drizzle from the schema alone and needs no database.
// `db:migrate` needs DATABASE_URL (Railway's Postgres 16, or a local one for development).
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
