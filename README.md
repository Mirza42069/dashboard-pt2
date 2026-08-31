# Ledgerhouse

Ledgerhouse is a multi-organization bank-reconciliation dashboard built with SvelteKit, oRPC, Prisma, Neon PostgreSQL, Better Auth, and Tailwind CSS.

## Local Setup

1. Install dependencies with `bun install`.
2. Copy the variable names from `apps/web/.env.example` into ignored `apps/web/.env`.
3. Set `DATABASE_URL` to a pooled, least-privileged Neon runtime connection string.
4. Set `DIRECT_URL` to a rotated direct Neon owner connection string. Keep this variable local; the Vercel sync script intentionally excludes it.
5. Set `BETTER_AUTH_SECRET` to at least 32 random characters and `BETTER_AUTH_URL` to `http://localhost:5173`.
6. Apply the schema with `bun run db:migrate`.
7. Bootstrap the organization, first legal entity, bank account, and administrator with `bun run db:seed-admin`.
8. Start the application with `bun run dev:web`.

Public signup is disabled. The bootstrap command requires an interactive terminal and accepts administrator credentials without echoing the password.

## Verification

- `bun run db:generate`
- `bun run check-types`
- `bun test`
- `bun run build`

Local Windows builds use `adapter-auto` because creating Vercel function symlinks requires Developer Mode or elevated privileges. Vercel builds set `VERCEL=1`, select `adapter-vercel`, and deploy functions to `sin1`.

## Deployment

1. Link a new project with `bunx vercel link`.
2. Sync safe runtime variables with `bun run env:production`.
3. Deploy with `bun run deploy:prod`.

`scripts/sync-vercel-env.ts` rejects `DIRECT_URL`, development auth bypasses, and owner-like database credentials. Never upload the Neon owner connection string as `DATABASE_URL`.
