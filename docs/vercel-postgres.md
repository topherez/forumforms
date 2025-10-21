## Switch to Vercel Postgres (Prisma-ready)

1) Create the database

- Vercel Dashboard → Storage → Add → Postgres → Create.

2) Environment variables (auto-provisioned by Vercel)

- In your Vercel project → Settings → Environment Variables, you will see these keys:
  - `POSTGRES_PRISMA_URL` (pooled; use as Prisma `DATABASE_URL`)
  - `POSTGRES_URL_NON_POOLING` (direct; use as Prisma `DIRECT_URL`)
  - Optionally: `POSTGRES_URL`, `POSTGRES_URL_NO_SSL`, etc.

3) Pull envs locally

```bash
vercel env pull .env
```

Ensure your `.env` contains:

```bash
DATABASE_URL="<value of POSTGRES_PRISMA_URL>"
DIRECT_URL="<value of POSTGRES_URL_NON_POOLING>"
```

4) Generate Prisma client and create initial migration locally

```bash
pnpm prisma:generate
pnpm prisma:migrate-dev --name init
```

5) Deploy & apply migrations in prod/preview

```bash
pnpm prisma:migrate
```

Your code does not require changes—only environment variables switch to the Vercel Postgres values.


