## Problem

When we swapped storage to Telegram, the upload path was locked to signed-in users. The server endpoint requires a Bearer token and the upload form blocks submission with "Please sign in to upload" — so anonymous uploads stopped working. The database still has the RLS policy that allows anonymous public inserts (`user_id IS NULL AND is_public = true`), so the only fix needed is in the upload code.

## Changes

### 1. `src/routes/api/public/tg-upload.ts`
- Make the Bearer token optional. If present, verify it and use that `user_id`; if missing or invalid, treat as anonymous (`user_id = null`).
- For anonymous requests, force `is_public = true` and ignore any `album_id` / `album_title` (anonymous uploads aren't tied to a user, so private/album flows don't apply — matches the existing anon RLS policy).
- Keep all other logic (50 MB limit, Telegram `sendDocument`, DB insert) unchanged.

### 2. `src/routes/upload.tsx`
- Remove the `isAnon` early-return in `onUpload`. Only fetch the Supabase session/bearer when a user exists; send the `Authorization` header only when present.
- Drop the "Please sign in to upload" copy on the page; keep the public toggle hidden for anonymous users (anon uploads are always public).
- After an anonymous upload, navigate to the image/album page as today.

### 3. Verification
- Sign out, upload one image, confirm it lands on `/i/:id` and is fetchable via `/api/public/tg-image/:id`.
- Repeat signed in to confirm authenticated uploads still work and still carry `user_id`.

No DB or RLS changes needed.