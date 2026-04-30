# Audio Guest Books

Multi-tenant SaaS for delivering audio guest book recordings (**Stage 1** — foundation scaffold).

## Stack

- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)
- PostgreSQL ([Neon](https://neon.tech/)) via `@neondatabase/serverless`
- Drizzle ORM @ `src/db/schema`
- [Clerk](https://clerk.com/) authentication (company dashboard)
- Hosted on Railway (Stage 2+ uploads / workers)

## Quick start

1. **Environment**

   ```bash
   cp .env.example .env.local
   ```

   Set `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `ROOT_DOMAIN` / `NEXT_PUBLIC_ROOT_DOMAIN` (defaults target `audioguestbooks.ca`).

2. **Database**

   ```bash
   npm install
   npx drizzle-kit migrate
   npm run db:seed
   ```

   `db:seed` inserts Free / Pro / Ultimate plans, nine feature rows, and `plan_features`. New companies receive `company_features` copied from Free plan features via onboarding.

3. **Dev**

   Zip extraction runs in a **background worker** (BullMQ + Redis). In development, run the app and worker in **two terminals**:

   ```bash
   npm run dev
   npm run worker
   ```

   Set `REDIS_URL` in `.env` (e.g. Upstash `rediss://…`). The worker uses the same `DATABASE_URL` and R2 variables as the Next.js app.

   - **Marketing**: [http://localhost:3000](http://localhost:3000)

   - **Tenant testing**: Map `something.localhost` (e.g. `acme.localhost`) to `127.0.0.1` via hosts file — middleware resolves `acme` as a slug and attaches `x-company-*` headers when a matching company exists.

   - **App host**: Plain `localhost` serves marketing at `/`; use `/dashboard` and `/sign-in` directly on the same origin in dev.

4. **Build**

   ```bash
   npm run build
   ```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle SQL from schema |
| `npm run db:migrate` | Apply migrations (`drizzle/`) |
| `npm run db:push` | Push schema directly (dev shortcuts) |
| `npm run db:seed` | Seed plans/features |
| `npm run db:studio` | Drizzle Studio |
| `npm run worker` | BullMQ worker (`tsx watch`; `import "dotenv/config"` loads `.env`) |

## Host routing

- **Apex / `www`**: Marketing site (`src/app/page.tsx`).
- **`app.<ROOT_DOMAIN>`**: Company app (dashboard, onboarding); `/` redirects to `/dashboard` when not localhost dual-purpose.
- **`<company-slug>.<ROOT_DOMAIN>`**: Retail tenant host; middleware looks up company by slug (Stage 3 retail UI).

Reserved subdomains (cannot be company slugs) live in `src/lib/reserved-subdomains.ts`.

## Stage boundaries

Implemented through **Stage 1** only:

- Drizzle schema: `plans`, `features`, `plan_features`, `companies`, `company_users`, `company_features`.
- Clerk + middleware (hostname + Clerk protect for `/dashboard`, `/onboarding`).
- Company onboarding (`/onboarding`) → Free plan features copied into `company_features`.
- No R2 uploads, Stripe, Redis, BullMQ, or retail audio player yet — see roadmap in project brief.
