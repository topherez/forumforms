## Prisma + Supabase setup

1) Create DATABASE_URL

- In Supabase → Project Settings → Database → Connection string → URI.
- Copy the Postgres URI. For serverless (Vercel/Edge), append:
  - `?pgbouncer=true&connection_limit=1`
- Put it in `.env.local` at the repo root:

```
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DB?pgbouncer=true&connection_limit=1"
```

2) Generate Prisma Client

```
pnpm prisma:generate
```

3) Create and run initial migration (dev)

```
pnpm prisma:migrate-dev --name init
```

4) Deploy migrations (CI/prod)

```
pnpm prisma:migrate
```

5) Optional: inspect data with Prisma Studio

```
pnpm prisma:studio
```

### Models included

- `CompanyPostFieldSchema` — stores each company's custom post field schema (JSON).
- `PostMetadata` — stores a post's metadata captured from that schema.

These are mapped to tables `company_post_field_schemas` and `post_metadata`.


