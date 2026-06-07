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

## Deploying to Vercel (frontend only)

> **Architecture**: Vercel hosts the **frontend (static client bundle) only**.
> All backend pieces — server functions, `/api/public/*` API routes, database,
> auth, storage, and the Telegram upload proxy — stay on **Lovable Cloud**.
> Vercel never runs Node server code for this app; the browser calls the
> Lovable backend directly.
>
> Why split it this way?
> - Vercel gives you a fast global CDN + custom domains for static assets.
> - Lovable Cloud already runs the Worker-based server functions, the
>   Supabase project (auth + Postgres + storage), and the Telegram bot proxy.
>   Replicating that on Vercel would mean re-provisioning everything.
> - One source of truth for secrets (`TELEGRAM_BOT_TOKEN`,
>   `SUPABASE_SERVICE_ROLE_KEY`, …) — they live on Lovable, never on Vercel.

### 1. Publish the backend on Lovable first

In the Lovable editor, click **Publish**. You get a stable backend URL like:

```
https://pixmehub.lovable.app                 # production
https://project--<project-id>-dev.lovable.app  # preview
```

Note this URL — the Vercel frontend will call it for every API request.

### 2. Import the repo on Vercel as a static site

1. Go to <https://vercel.com/new> and **Import** the GitHub repo.
2. **Framework Preset**: `Vite`.
3. **Build Command**: `bun run build:client` (or `npm run build:client`) — this
   builds only the client bundle, no Node server.
4. **Output Directory**: `dist/client`.
5. **Install Command**: `bun install` (or `npm install`).

> If your `package.json` does not yet have a `build:client` script, add:
> `"build:client": "vite build"` — this skips the TanStack Start server bundle
> and only emits the static client into `dist/client`.

### 3. Add ONLY the public env vars on Vercel

Vercel only needs the browser-visible variables plus the Lovable backend URL:

| Name | Value | Scope |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | your Supabase URL | all envs |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable (anon) key | all envs |
| `VITE_SUPABASE_PROJECT_ID` | project ref | all envs |
| `VITE_API_BASE_URL` | `https://pixmehub.lovable.app` (your Lovable URL) | all envs |

**Do NOT** add `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, or any
other server secret to Vercel — those stay on Lovable.

### 4. Point the client at the Lovable backend

In `src/lib/api.ts` (create if missing), build absolute URLs against
`VITE_API_BASE_URL`:

```ts
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
export const apiUrl = (path: string) =>
  `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
```

Then use `apiUrl("/api/public/tg-upload")` everywhere instead of a bare
`/api/public/tg-upload`. The Lovable `/api/public/*` routes already allow
cross-origin calls.

### 5. Allow the Vercel origin in Supabase Auth

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<your-app>.vercel.app`
- **Additional redirect URLs**:
  - `https://<your-app>.vercel.app/**`
  - `https://*-<team>.vercel.app/**` (preview deployments)
  - `https://pixmehub.lovable.app/**` (keep Lovable working too)

### 6. Deploy

Click **Deploy** on Vercel. After the first deploy:

- Pushes to `main` → production frontend on Vercel
- Pull requests → Vercel preview deployments
- Every preview/production frontend talks to the **same** Lovable backend

### 7. (Optional) Custom domain

Add the custom domain in **Vercel → Project → Settings → Domains**, then
add it to the Supabase Auth redirect allow-list (step 5).

### What stays on Lovable

- All `createServerFn` handlers (backup/restore, admin actions, etc.)
- `src/routes/api/public/tg-upload.ts` and any other `/api/*` route file
- Supabase project (auth, Postgres, RLS, storage `images` bucket)
- Secrets: `TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`,
  `LOVABLE_API_KEY`
- Edge logs and the `cloud_status` health endpoint


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
