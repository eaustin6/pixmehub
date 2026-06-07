# Lumen — Image hosting (PixmeHub)

A night-themed image hosting app built with **TanStack Start**, **React 19**,
**Tailwind v4**, **shadcn/ui**, and **Supabase** (auth + Postgres + storage).
Upload single images or whole albums, share short links, manage everything from
a built-in admin **Control panel**, and back up the entire database to a single
JSON file.

Live demo: <https://pixmehub.lovable.app>

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Local development](#local-development)
4. [Environment variables](#environment-variables)
5. [Database setup](#database-setup)
6. [Pushing to GitHub](#pushing-to-github)
7. [Deploying to Vercel](#deploying-to-vercel)
8. [Super admin account](#super-admin-account)
9. [Admin control panel](#admin-control-panel)
10. [Backup & restore](#backup--restore)
11. [Project structure](#project-structure)
12. [Troubleshooting](#troubleshooting)

---

## Features

- Email/password + Google sign-in
- Single image and album uploads (drag & drop)
- Public gallery with album grouping
- Image detail page with **direct device download** button
- Animated anime neko background, dark glass UI
- Super-admin **Control panel** for moderation
- One-click **JSON backup** of every table + storage listing
- One-click **restore** from a backup file (idempotent upsert by `id`)

---

## Tech stack

- TanStack Start v1 (SSR + server functions, Vite 7)
- React 19, TypeScript (strict mode)
- Tailwind CSS v4 (CSS-first config in `src/styles.css`)
- shadcn/ui + Radix UI
- Supabase — Auth, Postgres (RLS), Storage (`images` bucket)
- Lovable Cloud (managed Supabase backend)

---

## Local development

```bash
# 1. Install deps (bun recommended; npm/pnpm also work)
bun install

# 2. Copy env template and fill in values (see next section)
cp .env.example .env

# 3. Run the dev server
bun dev
# → http://localhost:5173
```

> Node 20+ required. Bun 1.1+ recommended.

---

## Environment variables

Create a `.env` in the project root:

```env
# Browser-visible (must be prefixed VITE_)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>

# Server-only (NEVER prefix with VITE_)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # keep secret
```

| Variable | Where it's used | Safe in browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser client | yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser client | yes (RLS enforced) |
| `VITE_SUPABASE_PROJECT_ID` | misc tooling | yes |
| `SUPABASE_URL` | server functions | yes |
| `SUPABASE_PUBLISHABLE_KEY` | server functions (auth-middleware) | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | admin server client (backup/restore) | **no — server only** |

The service role key bypasses RLS. It is only imported from
`src/integrations/supabase/client.server.ts` and only used inside
`createServerFn` handlers — never from a React component.

---

## Database setup

All schema lives in `supabase/migrations/`. On Lovable Cloud, migrations run
automatically. For a fresh self-hosted Supabase project:

```bash
npm i -g supabase
supabase link --project-ref <project-ref>
supabase db push
```

Then in the Supabase dashboard:

1. **Storage → New bucket** → name `images`, **private**.
2. **Authentication → Providers** → enable **Email** (and optionally **Google**;
   add OAuth client ID/secret).
3. **Authentication → URL Configuration** → add your local + production URLs
   to the redirect allow-list.

---

## Pushing to GitHub

### Option A — from Lovable (recommended, two-way sync)

1. In the Lovable editor, click **GitHub** (top right) → **Connect to GitHub**.
2. Authorize the **Lovable GitHub App** for the account/org you want.
3. Click **Create repository**. Lovable creates the repo and starts a
   real-time two-way sync (commits in either direction propagate).

### Option B — manually

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

---

## Deploying to Vercel

TanStack Start outputs both a static client and a Node server bundle, so the
project must deploy as a **Node.js** app (not a static site).

### 1. Import the repo

1. Go to <https://vercel.com/new> and **Import** the GitHub repo.
2. **Framework Preset**: `Other`.
3. **Build Command**: `bun run build` (or `npm run build`).
4. **Install Command**: `bun install` (or `npm install`).
5. **Output Directory**: leave default.

### 2. Add environment variables

In **Project Settings → Environment Variables**, add every variable from
your `.env`, scoped to **Production**, **Preview**, and **Development**:

| Name | Scope |
| --- | --- |
| `VITE_SUPABASE_URL` | all envs |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | all envs |
| `VITE_SUPABASE_PROJECT_ID` | all envs |
| `SUPABASE_URL` | all envs |
| `SUPABASE_PUBLISHABLE_KEY` | all envs |
| `SUPABASE_SERVICE_ROLE_KEY` | all envs (**Secret**) |

### 3. Update Supabase Auth redirects

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<your-app>.vercel.app`
- **Additional redirect URLs**:
  - `https://<your-app>.vercel.app/**`
  - `https://*-<team>.vercel.app/**` (for preview deployments)

### 4. Deploy

Click **Deploy**. After the first deploy:

- Pushes to `main` → production
- Pull requests → preview deployments at unique URLs

### 5. (Optional) Custom domain

**Project → Settings → Domains → Add**, follow the DNS instructions, then add
the new domain to Supabase Auth redirects too.

---

## Super admin account

A super admin account is pre-seeded:

| Field | Value |
| --- | --- |
| Email | `niaznafis264@gmail.com` |
| Password | `Niaz@1234` |
| Role | `super_admin` (row in `public.user_roles`) |

> Change the password immediately after first sign-in (account menu → settings).

### Grant the role to another user

```sql
insert into public.user_roles (user_id, role)
values ('<auth-user-uuid>', 'super_admin');
```

You can find a user's UUID under **Authentication → Users** in Supabase.

---

## Admin control panel

Sign in as a super admin and open **/admin** (a link appears in the header).
From there you can:

- **Browse / search** every image on the platform (including hidden ones).
- **Hide**, **restore**, or **permanently delete** any image.
- **Add files** — jumps to the upload flow.
- **Backup database** — downloads a full JSON snapshot.
- **Restore backup** — uploads a JSON file and upserts the rows back in.

Non-super-admins who navigate to `/admin` see a "Forbidden" screen.

---

## Backup & restore

### What's in a backup

A backup is a single JSON file:

```jsonc
{
  "exported_at": "2026-06-07T12:34:56.000Z",
  "version": 1,
  "tables": {
    "images":     [ /* every row */ ],
    "profiles":   [ /* every row */ ],
    "user_roles": [ /* every row */ ]
  },
  "storage_images": [ /* listing of files in the `images` bucket */ ]
}
```

> **Note**: the storage section is a *listing* of files (paths + metadata),
> not the binary file contents. The files themselves still live in the
> Supabase Storage bucket. To migrate raw files, mirror the bucket with the
> Supabase CLI: `supabase storage cp -r ss://images ./images-backup`.

### Restoring

1. Open **/admin** as a super admin.
2. Click **Restore backup** and pick the JSON file.
3. Confirm the dialog. Rows are **upserted by `id`**, so:
   - Existing rows with the same `id` are overwritten.
   - New rows are inserted.
   - Rows present in the DB but missing from the backup are **not** deleted.

The restore order is `profiles → user_roles → images` to satisfy FK
constraints.

---

## Project structure

```
src/
├── routes/                  # File-based TanStack Router routes
│   ├── __root.tsx           # Root layout, head meta, background, footer
│   ├── index.tsx            # Landing page / public gallery
│   ├── upload.tsx           # Single + album upload
│   ├── i.$id.tsx            # Image detail (with Download button)
│   ├── a.$id.tsx            # Album detail
│   ├── auth.tsx             # Sign in / sign up
│   └── _authenticated/      # Gated subtree
│       ├── route.tsx        # Auth gate (integration-managed)
│       ├── my-uploads.tsx   # User's own uploads
│       └── admin.tsx        # Super-admin control panel
├── lib/
│   ├── images.ts            # Browser image helpers
│   └── backup.functions.ts  # Server fns — backup + restore (super-admin only)
├── integrations/supabase/   # Auto-generated clients (do not edit)
├── components/              # UI + shadcn components
├── assets/                  # Background, neko sprites
└── styles.css               # Tailwind v4 theme tokens
supabase/
└── migrations/              # SQL schema, RLS policies, seed data
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Failed to fetch dynamically imported module` after edits | Hard-refresh the browser; Vite HMR cache miss. |
| `Unauthorized: No authorization header` from a server fn | The browser session is missing; sign in again. `attachSupabaseAuth` is wired in `src/start.ts`. |
| Google sign-in says "Unsupported provider" | Enable the Google provider in Supabase → Authentication → Providers. |
| `permission denied for table …` | Make sure the migration includes `GRANT` statements (every public table must grant `SELECT/INSERT/...` to `authenticated`). |
| Backup download is empty | You're not a `super_admin`; the server fn returns 403. |

---

## License

MIT — built with ♥ by **Niaz Nafis**.
