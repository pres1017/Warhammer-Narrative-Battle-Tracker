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
3. **Apply the schema**: Dashboard → SQL Editor → paste and run each file in
   [supabase/migrations/](supabase/migrations/) **in numeric order**
   (`0001_…`, `0002_…`, `0003_…`). Together they create the tables,
   row-level-security policies, the `create_campaign` / `join_campaign`
   functions, optional name passwords, the `army-files` storage bucket, and
   realtime publications. When new migrations appear later, run only the new
   ones.
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
the UI. Admins and moderators can also rename planets and rewrite their
descriptions from the planet panel on the map.

## Name passwords

Joining a campaign needs only an invite code and a display name. The
password field is optional, when2meet-style:

- Set a password when you first join and your name is protected: signing in
  with that name from any device then requires the password.
- A name without a password can be claimed by anyone who types it (that's
  also how you move to a new device without a password).
- Passwords are bcrypt-hashed in a table no client can read; only the
  `create_campaign` / `join_campaign` functions touch it.
