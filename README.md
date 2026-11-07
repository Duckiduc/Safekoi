# Safekoi

A fast, mobile-first workout tracker: log sessions set by set, follow programs with
progressive-overload suggestions, run rest timers, and track personal records.

**Stack:** SvelteKit 3 + Svelte 5 · TypeScript · Tailwind CSS 4 · PostgreSQL 17 + Drizzle ORM ·
Better Auth (email/password, passkeys, admin) · Node 24 · Docker.

## Features

- **Auth** — email + password and passkeys (Face ID / Touch ID), device list with
  "sign out other devices". No email is ever sent. The first account created becomes admin.
- **Admin** — `/admin/users`: turn public sign-up on/off, add users, set a user's password
  (for forgotten passwords), make admin, ban/unban, sign out everywhere, delete.
- **Live logger** — start from a program day, a template, a past workout, or empty. Shows last
  session's sets, auto-fills weights down the list, warm-up sets, RPE, offline write queue.
- **Rest timer** — starts when you tick a set; ±15s; vibration, beep and notification; keeps the
  screen awake; survives reloads and the phone sleeping.
- **PRs** — heaviest weight, estimated 1RM (Epley), best set volume, most reps, longest hold.
  Detected on every completed set, with a progress chart per exercise.
- **Programs & suggestions** — Full Body 3×, 5×5, Upper/Lower, Push/Pull/Legs. Next session on Home;
  weights go up when you hit the top of the rep range, deload 10% after two misses. kg or lb.
- **History & stats** — weekly sets per muscle group, streaks, "not trained in a week".
- **English & French** — follows the phone's language; switch anytime in Profile.
- **PWA** — installable, offline shell.

## Develop

```bash
npm install
cp .env.example .env            # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:start                # Postgres on :5433
npm run db:setup                # migrations + built-in exercises/programs
npm run dev                     # http://localhost:5173
```

| Script                                 | What it does                                              |
| -------------------------------------- | --------------------------------------------------------- |
| `npm run check`                        | Type-check                                                |
| `npm run lint`                         | Prettier + ESLint                                         |
| `npx vitest --run`                     | Unit tests (training math, PR rules, progression)         |
| `npm run db:generate -- --name <name>` | New migration after editing `src/lib/server/db/schema.ts` |
| `npm run db:studio`                    | Browse the database                                       |

## Deploy (homelab / Portainer)

`compose.prod.yaml` runs the app, Postgres, and a nightly `pg_dump` backup container.
The app applies migrations and refreshes the built-in exercises on every start.

1. Point a domain at the host through your reverse proxy with HTTPS (passkeys require HTTPS),
   e.g. `safekoi.example.com` → `http://<host>:3000`.
2. In Portainer, create a stack from this repo (or upload the folder) using `compose.prod.yaml`,
   and set these environment variables:

   | Variable                  | Example                             |
   | ------------------------- | ----------------------------------- |
   | `ORIGIN`                  | `https://safekoi.example.com`       |
   | `PASSKEY_RP_ID`           | `safekoi.example.com`               |
   | `BETTER_AUTH_SECRET`      | output of `openssl rand -base64 32` |
   | `POSTGRES_PASSWORD`       | a long random string                |
   | `APP_PORT` _(optional)_   | `3000`                              |
   | `BACKUP_DIR` _(optional)_ | `/srv/safekoi/backups`              |

3. Deploy, open the site, and register — the first account becomes admin.
4. If the site is reachable from the internet, turn off **Public sign-up** in `/admin/users`
   and add other people from there.

Forgot your password? Sign in with a passkey, or have an admin set a new one. If you're the only
admin and locked out, register a new account (sign-up must be open) and promote it from the host:

```bash
docker compose -f compose.prod.yaml exec db psql -U safekoi -c "update \"user\" set role='admin' where email='you@example.com'"
```

Then set your old account's password from `/admin/users`.

## Layout

```
messages/{en,fr}.json         UI text (Paraglide); add a language by adding a file + locale in project.inlang
src/lib/i18n.ts               translation helpers; catalog-fr.ts has French exercise/program names
src/lib/fitness.ts            training math: e1RM, PR rules, progression, units (unit-tested)
src/lib/timer.svelte.ts       rest timer
src/lib/sync.ts               fetch helper with offline retry queue
src/lib/server/auth.ts        Better Auth config
src/lib/server/db/            Drizzle schema (auth + app tables)
src/lib/server/workouts.ts    workout queries, ownership checks, set pre-fill
src/lib/server/pr.ts          PR detection
src/lib/server/recommend.ts   next program day, neglected muscles, weekly volume
src/lib/server/seed-data.ts   built-in exercises and programs
src/routes/(auth)/            login, register
src/routes/(app)/             home, workout, history, prs, templates, programs, exercises, settings, admin
src/routes/api/               JSON endpoints used by the live logger
```
