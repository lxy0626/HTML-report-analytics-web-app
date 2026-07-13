# MT4 Strategy Tester Report Tracker

_For MT4 EA training purposes._

A small dashboard for tracking how an MT4 Expert Advisor's backtest results evolve as you tune
it. Each time you re-run a Strategy Tester backtest and get a fresh `StrategyTester.htm`, upload
it here — the app extracts every metric (net profit, profit factor, drawdown, win rate, streaks,
the trade-by-trade equity curve, the EA's input parameters) and gives you trend charts and
side-by-side comparisons across all your runs.

## Architecture

Three tiers, all on free infrastructure:

1. **Presentation** — this React + TypeScript + Vite single-page app, built to static files and
   served by **GitHub Pages**.
2. **Logic / API** — **Supabase**: Postgres's auto-generated REST API (PostgREST) plus Row Level
   Security policies. There's no custom backend server — RLS *is* the access-control layer: every
   request is scoped to `auth.uid()`, enforced by Postgres itself.
3. **Data** — Supabase Postgres (one `reports` row per upload, with all parsed metrics as real
   columns plus JSONB for the parameters and trade log) and Supabase Storage (a private bucket
   holding the original uploaded `.htm` files).

Report parsing happens entirely in the browser (`src/lib/parseReport.ts`, using `DOMParser`) —
nothing is sent anywhere until you review the parsed preview and click Save.

## One-time setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project, and open **SQL Editor**.

### 2. Run the schema

Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) into a new query and run it.
This creates the `reports` table, enables Row Level Security, and creates the private
`reports-raw` storage bucket with matching access policies.

### 3. Create your account

This is a single-user app — there's no public sign-up screen. In the Supabase dashboard:

- Go to **Authentication → Sign In / Providers → Email** and turn **off** "Allow new users to
  sign up" (wording varies slightly by dashboard version).
- Go to **Authentication → Users → Add user** and create your own email/password login.

### 4. Configure environment variables

Find your Project URL and anon/public key under **Project Settings → API**.

For local development, copy `.env.example` to `.env` and fill them in:

```bash
cp .env.example .env
```

For deployment, add them as **GitHub repository secrets** (Settings → Secrets and variables →
Actions → New repository secret):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> The anon key is safe to ship in the built JS bundle — it's a public key by design. Every table
> and storage object it can touch is locked down by the RLS policies in `supabase/schema.sql`.
> The `service_role` key is never used by this app and should never be put anywhere in it.

### 5. Enable GitHub Pages

Go to **Settings → Pages** and set **Source** to **GitHub Actions**. Pushing to `main` will now
build and deploy automatically via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Local development

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the parser unit tests
npm run build    # production build (type-checks, then builds to dist/)
```

## Automatic upload from MT4

Instead of manually uploading `StrategyTester.htm` after every backtest, the Dashboard has an
**Auto-upload** card that watches it for you, right in the browser:

1. Click **Choose report file** and select your `StrategyTester.htm` once (a native file picker —
   the browser remembers this choice for next time).
2. Click **Start watching**. While that tab stays open, it polls the file every few seconds; the
   moment MT4 rewrites it after a new backtest, the report is parsed and uploaded automatically —
   no separate script, no extra credentials (it reuses your existing logged-in session).
3. Close the tab (or click **Stop watching**) and it stops — nothing runs in the background
   otherwise, matching a "only active while I'm testing" workflow.

This uses the browser's **File System Access API**, which only Chromium-based browsers (Chrome,
Edge) support — Firefox and Safari will see a message pointing to the regular Upload page instead.

## Notes on the parser

`src/lib/parseReport.ts` targets the classic **MT4** Strategy Tester HTML report format (a
summary table followed by a trade-by-trade table with a running balance column). MT5 reports use
a different, richer layout and are not currently supported. Parsing is best-effort: unrecognized
fields are left blank with a warning rather than failing the upload, and the original file is
always kept in Storage regardless.

## Security notes

- Row Level Security is enabled on every table and storage bucket; policies scope all access to
  `auth.uid()`.
- Public sign-up is disabled — this is a single-user app with one manually-created account.
- Uploaded reports are validated (extension, size, content marker) before parsing, and the
  original HTML is never injected into the app's DOM — it's only ever shown inside a sandboxed,
  script-disabled `<iframe>` via a short-lived signed URL, or parsed as plain data.
- The Storage bucket is private; originals are only reachable via signed URLs.
- A strict Content-Security-Policy is injected into the production build only (it would break
  Vite's dev-server HMR, which relies on inline/eval'd scripts).
- `.env` is git-ignored; only the public anon key is ever used client-side.
