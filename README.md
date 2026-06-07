# Lumen — Image hosting (PixmeHub)

A minimal, night-themed image hosting app built with **TanStack Start**,
**React 19**, **Tailwind v4**, **shadcn/ui** and **Supabase** (auth, Postgres,
storage). Upload single images or full albums, share links, and manage the
platform from a built-in admin control panel.

Live preview: <https://pixmehub.lovable.app>

---

## Tech stack

- TanStack Start v1 (SSR + server functions, Vite 7)
- React 19, TypeScript (strict)
- Tailwind CSS v4 (CSS-first config in `src/styles.css`)
- shadcn/ui + Radix UI
- Supabase: Auth, Postgres (RLS), Storage (`images` bucket)
- Lovable Cloud (managed Supabase backend)

---

## Local development

```bash
bun install        # or: npm install / pnpm install
bun dev            # starts Vite dev server (default http://localhost:5173)
```

### Required environment variables

Create a `.env` in the project root with:

```env
# Browser-visible (must be prefixed VITE_)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>

# Server-only (do NOT prefix with VITE_)
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-publishable-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>   # server only — keep secret
```

The Supabase publishable / anon key is safe to ship to the browser. The
**service role key is server-only** — used inside `createServerFn` handlers
(e.g. database backups) and never imported from React components.

---

## Database setup

All schema lives in `supabase/migrations/` and runs automatically on Lovable
Cloud. If you're wiring this to a fresh Supabase project, apply the migrations
with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Then create a storage bucket named **`images`** (private) and enable the
Google OAuth provider in Authentication → Providers if you want social sign-in.

---

## Deploying to Vercel

> TanStack Start outputs a server bundle, so you must deploy it as a
> **Node.js** project on Vercel — not a static site.

### 1. Push to GitHub

In Lovable: click **GitHub → Connect to GitHub** (top right) and create a
repository. Lovable will keep the repo in two-way sync with the editor.

If you've cloned the code locally instead:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Import the repo on Vercel

1. Go to <https://vercel.com/new> and import the GitHub repository.
2. **Framework Preset**: select **Other** (TanStack Start is detected via
   `vite.config.ts`; no preset override needed).
3. **Build Command**: `bun run build` (or `npm run build`).
4. **Output Directory**: leave default — Vite/TanStack Start manages this.
5. **Install Command**: `bun install` (or `npm install`).

### 3. Add environment variables

In **Project Settings → Environment Variables**, add the same values from
your local `.env`:

| Name | Scope | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Production, Preview, Development | Public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development | Public |
| `VITE_SUPABASE_PROJECT_ID` | Production, Preview, Development | Public |
| `SUPABASE_URL` | Production, Preview, Development | Server |
| `SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | **Secret** |

### 4. Configure Supabase Auth redirects

In Supabase → Authentication → URL Configuration, add your Vercel URLs to the
allow-list:

- Site URL: `https://<your-app>.vercel.app`
- Additional redirect URLs:
  - `https://<your-app>.vercel.app/**`
  - `https://*-<your-team>.vercel.app/**` (for preview deployments)

### 5. Deploy

Click **Deploy**. Subsequent commits to `main` ship to production
automatically; PRs get preview URLs.

---

## Admin control panel

Sign in as a user that has the `super_admin` role (see `user_roles` table).
The header reveals an **Admin** link that opens `/admin` where you can:

- Browse / search every image on the platform
- Hide, restore, or permanently delete images
- Upload new files via **Add files**
- Download a full JSON backup of the database (`images`, `profiles`,
  `user_roles`, plus a listing of the storage bucket) via **Backup database**

To grant another user the role:

```sql
insert into public.user_roles (user_id, role)
values ('<auth-user-uuid>', 'super_admin');
```

---

## Project structure

```
src/
├── routes/                # File-based TanStack Router routes
│   ├── __root.tsx         # Root layout, head meta, background, footer
│   ├── index.tsx          # Landing page
│   ├── upload.tsx         # Single + album upload
│   ├── i.$id.tsx          # Image detail
│   ├── a.$id.tsx          # Album detail
│   ├── auth.tsx           # Sign in / sign up
│   └── _authenticated/    # Gated subtree (my uploads, admin)
├── lib/
│   ├── images.ts          # Browser image helpers
│   └── backup.functions.ts# Server fn — DB backup (super-admin only)
├── integrations/supabase/ # Auto-generated clients (do not edit)
├── components/            # UI + shadcn components
└── styles.css             # Tailwind v4 theme tokens
```

---

## License

MIT — built with ♥ by Niaz Nafis.
