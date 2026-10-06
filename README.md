# MkulimaLink

A produce marketplace for Kenyan smallholder farmers. It publishes a daily
farm-gate price board, lets a farmer post a harvest as a lot, and holds the
buyer's payment until both sides agree the weight at collection.

The farmer is paid the full amount. The 6% platform fee is charged to the buyer
on top and is never deducted from a payout.

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on `:5173` |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Serve the built bundle |
| `npm run lint` | ESLint over the whole tree |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/data/seed/` |

### Configuration

Copy `.env.example` to `.env` and fill in two values from the Supabase dashboard
under **Project Settings → API**:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / public key>
```

**Every `VITE_` value is compiled into the client bundle and is public.** That is
correct for these two — the anon key is designed to ship in a browser, carries the
`anon` role and nothing more, and row-level security is what actually guards the
data. The `service_role` key bypasses RLS completely and must never appear in this
repo or in a `VITE_` variable.

With both blank the app still runs: sign-in falls back to a local demo session and
every screen reads the seeded market under `src/data/seed/`. The operator
dashboard's "Supabase project" health check reports which of the two you are in,
rather than a decorative green tick, and the sign-in page says so too.

### Setting up the database

The whole schema is one migration. With the CLI linked to a project:

```bash
supabase db push
```

Or paste `supabase/migrations/20260826090000_init.sql` into the SQL editor and run
it. `supabase/seed.sql` is optional and separate — it fills the board, the lots and
forty-five accounts so the operator screens have something to show; skip it on a
project you intend to keep.

The migration also creates `public.staff_emails` and puts the first operator
address in it. Anyone on that list gets `is_staff = true` the moment they sign up:

```sql
insert into public.staff_emails (email, note)
values ('someone@example.com', 'Second operator')
on conflict (email) do nothing;
```

Emails must be lowercase — the table has a check constraint saying so, because a
case-sensitive comparison against an allowlist is a bug waiting for a capital
letter. Then sign up once through the normal `/signin` form with that address.
Supabase Auth holds the password, so it is never in this repo. If the address
signed up *before* the migration ran, the tail of the migration promotes it.

## How it is put together

Vite 7, React 19, React Router 7, Tailwind CSS v4, supabase-js 2. JSX rather than
TypeScript, matching the scaffold this started from.

```
src/
  routes/          one file per screen; admin/ holds the operator screens
  components/
    ui/            Button, Badge, Field, Feedback — the whole kit
    layout/        the public header/footer and the signed-in app shell
    admin/         operator shell, table primitives, the signups chart
  context/         auth, market, admin and theme providers, each split from its
                   context object so Fast Refresh keeps working
  data/            the data layer: market.js and admin.js each read Postgres or
                   fall back to seed/, derive.js mirrors the SQL aggregates, and
                   catalog/people/ops hold the vocabulary
  lib/             supabase client, formatters, class merge
  styles/app.css   the entire design system: tokens, then utilities
supabase/
  migrations/      the schema, RLS policies and admin_* functions
  seed.sql         optional demo rows
scripts/
  generate-seed.mjs  turns src/data/seed/ into seed.sql
  check-sql.mjs      parses the SQL with libpg-query, no server needed
```

There is no CSS beyond `app.css`. Colour, type and spacing are tokens defined
there; components only ever name tokens, never hex values.

### One fetch, two sources

`loadMarket()` and `loadAdmin()` each return the same shape whichever source
answered, so no screen knows or cares which one it got. `source` is exposed only
so the health strip and the sign-in page can be honest about it.

Providers fetch once for the whole app rather than per screen — the board appears
on the landing page, the market, a lot's own page and the sign-in panel, and four
copies of it would be four chances to disagree on a morning when prices move
between renders.

Both providers stamp a completed load with the attempt that produced it, so
`loading` is a comparison rather than a flag set inside an effect. The practical
difference: an operator verifying an account sees the badge change instead of the
page emptying out, and a gate is never asked to rule on a half-loaded identity.

### Theming

Two themes, driven by a `dark` class on `<html>` that is set before first paint in
`index.html` so there is no flash. Tokens that flip live in `:root` / `.dark`;
fixed brand hues live in `@theme`. The `@theme inline` block is what makes the flip
work at runtime — it keeps the `var()` reference inside each generated utility
instead of resolving it at build time.

One consequence worth knowing: the price board stays dark in *both* themes, because
a market board is a physical object. It re-points the flipping ink and price tokens
to their dark steps for its own subtree, so anything dropped inside it inherits the
right colours automatically. It does **not** re-point `--alert`, so the shared
`ErrorState` cannot be used in there — the board writes its own failure state in
board tones. See the comment on `board-panel`.

### Contrast

Every text colour in the app has been checked by computation, not by eye — all at
or above WCAG AA (4.5:1, or 3:1 for large text). Ratios are quoted in comments next
to the tokens they belong to, always against the *darkest* surface the token is
used on.

If you change a colour, re-check it. Resolve colours through a canvas rather than
parsing `getComputedStyle` — Tailwind's alpha modifiers produce `oklab(… / a)`, and
a regex over that yields both false passes and false failures.

Status is never carried by colour alone: every state ships with a word and a glyph.
Price direction is an arrow plus a sign as well as a hue, and down-moves are magenta
rather than red so the up/down pair stays separable for red-green colour blindness.
Marigold is a fill and a rule, never text — warning ink is `--warn-fg`.

### Loading, empty and failed are three different things

A screen that renders zeros while a query is in flight tells an operator there is
nothing in any queue this morning, which is the most expensive lie the dashboard
can tell. So every screen distinguishes:

- **failed** — the message from Postgres verbatim, and a retry;
- **loading** — a skeleton, and only until the *first* load lands;
- **empty** — a sentence saying what would put something here, plus the action
  that would.

An empty board, an empty market and an empty registrations table are all real
states, not errors, and each says so in its own words.

## Operator view

`/admin` has four screens: an overview with new-account and county figures, the
registration queue, flagged lots, and settlement. Registrations can verify or hold
an account; flagged lots can be cleared or stopped from trading. Everything else is
read-only.

Access is `profiles.is_staff`, set by the signup trigger from `public.staff_emails`.
That table has no RLS policy at all, so only the `security definer` trigger and the
service role can read it — the browser can no more grant itself the flag than list
the addresses. A signed-in non-operator who visits `/admin` is redirected to their
own dashboard.

**The flag decides what the interface offers; Postgres decides what it may have.**
Every `admin_*` function re-checks `is_staff()` and raises `42501` if the caller is
not staff, so a forged flag in the bundle buys a broken page and no data. The
aggregates are functions rather than selects for the same reason the phone numbers
are masked in SQL: the dashboard needs eight numbers and a fourteen-bar chart, and
pulling forty-five full records to a browser to compute them would put every phone
number on the wire to draw a table that hides them.

Writes go through `security definer` functions that append to `admin_actions` on
the way past, so the audit trail does not depend on the client asking for one.

### Security note on this repo

`.env` is tracked in the first commit. Nothing secret is in it now, but the next
person to paste a real key in there commits it. Fix it once:

```bash
git rm --cached .env
```

`.gitignore` already excludes it, so that one command is enough — the file stays on
disk and stops being versioned.

## Data

`src/data/seed/` is a complete, internally consistent market: a lot with an open
weight dispute shows its money as *held* on the settlement screen, not in flight.
That is deliberate, so the screens can be judged as a working system rather than as
unrelated piles of placeholder text — and so the no-project mode is a usable
demonstration rather than a broken app.

`src/data/derive.js` computes the same aggregates in JavaScript that the migration
computes in SQL, function for function. They have to agree: the same chart renders
whichever produced the numbers, and one that reads differently depending on whether
a project is attached is worse than one that only works when it is.
