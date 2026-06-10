# Setup

## Local development

```
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
```

Without any configuration the app works in **offline mode**: the landing
page's "play offline" link stores one campaign in your browser's
localStorage.

## Cloud campaigns (Supabase)

Cloud campaigns enable invite codes, multiple players, roles, and (Phase 4)
realtime sync.

1. Create a free project at [supabase.com](https://supabase.com).
2. **Enable anonymous sign-ins**: Dashboard → Authentication → Sign In / Up →
   enable "Allow anonymous sign-ins".
3. **Apply the schema**: Dashboard → SQL Editor → paste the contents of
   [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) →
   Run. This creates the tables, row-level-security policies, the
   `create_campaign` / `join_campaign` functions, the `army-files` storage
   bucket, and realtime publications.
4. **Configure the app**: copy `.env.example` to `.env.local` and fill in the
   Project URL and anon/public key from Project Settings → API. Restart
   `npm run dev`.

## Deploy (Vercel)

1. Push the repo to GitHub.
2. Import it at [vercel.com](https://vercel.com) (framework auto-detected).
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables.
4. Deploy. Share invite links: `https://your-app.vercel.app/join/CODE`.

## Roles

| Role | In-app name | Can |
|---|---|---|
| admin | Warmaster | Everything: generate/lock the system, promote/demote moderators, remove players, edit any battle |
| moderator | Lieutenant | Edit/delete/reorder any battle, remove players |
| member | Commander | Add battles; edit/delete/reorder their own battles |

The campaign creator is the admin. Enforcement is in Postgres RLS, not just
the UI.
