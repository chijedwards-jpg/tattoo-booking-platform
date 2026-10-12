# Tattoo Booking Platform — Local Setup

## Prerequisites
- Node.js 18.18+ (check with `node -v`)
- A Postgres database (easiest options: [Neon](https://neon.tech) or
  [Supabase](https://supabase.com) free tier, or `brew install postgresql`
  locally)

## First-time setup

```bash
# 1. Create the Next.js app structure (if not already scaffolded)
#    Skip this if you're dropping these files into an existing project.
npx create-next-app@latest tattoo-booking-platform --typescript --tailwind --app --no-src-dir
cd tattoo-booking-platform

# 2. Copy in the provided files, preserving paths:
#    prisma/schema.prisma
#    lib/pricingEngine.ts
#    lib/pricingEngine.test.ts
#    package.json  (merge/replace)

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env
# then fill in DATABASE_URL, GEMINI_API_KEY, SESSION_SECRET, RESEND_API_KEY

# 5. Create the database tables from the schema
npx prisma migrate dev --name init

# 6. Verify the pricing engine logic
npx tsx lib/pricingEngine.test.ts

# 7. Run the dev server
npm run dev
```

Then open http://localhost:3000.

## What each dependency is for

| Package | Purpose |
|---|---|
| `next`, `react`, `react-dom` | App framework |
| `@prisma/client` + `prisma` | Database ORM, matches `schema.prisma` |
| `bcryptjs` | Password hashing for artist login |
| (Gemini API, via `fetch`) | AI image analysis for tattoo style/complexity/time (PRD section 9) — no SDK package needed |
| `resend` | Transactional email notifications (PRD section 28) |
| `zod` | Runtime validation for API route inputs |
| `date-fns`, `date-fns-tz` | Appointment/availability time math (PRD sections 17-19) |
| `tailwindcss` | Styling |
| `tsx` | Run TypeScript files directly (used for the pricing engine tests) |

## Notes
- `DATABASE_URL` needs a real reachable Postgres instance — a free Neon or
  Supabase project takes about 2 minutes to spin up if you don't have one.
- `SESSION_SECRET` is required for artist login to work (it signs the session
  cookie) — generate one with `openssl rand -hex 32` or similar.
- `GEMINI_API_KEY` and `RESEND_API_KEY` can be added later — the pricing
  engine and schema work without them. You'll need the Gemini key for the
  submission intake flow, since it calls the image-analysis API route
  directly.
- Three transactional emails exist (`lib/email.ts`), all client-facing: one
  right after a submission is created (what to expect next, varies by
  routing outcome), one when an artist approves a submission that needed
  review, and one when a slot actually gets booked (with a Google Calendar
  "add to calendar" link, and deposit instructions if it's a paid tattoo
  appointment). Without `RESEND_API_KEY` set, each one logs a warning and
  is skipped rather than failing the request it's attached to — a
  submission or booking always succeeds even if email delivery doesn't.
- Deposits aren't processed by this app — a tattoo appointment is booked
  immediately (no payment gate), and the client is shown the artist's own
  payment instructions (Venmo/CashApp/PayPal/etc, set in Settings → Pricing
  & deposit). The artist marks the deposit received from the submission's
  page in the dashboard once it actually arrives.
- The app has no calendar of its own — the dashboard Calendar tab is a
  single Google Calendar integration (real OAuth, `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` below). Once connected: busy times on the artist's
  real calendar are kept off the slots offered to clients, every booking
  made through the page is pushed there as a real event, and that same
  calendar is embedded on the dashboard as the only schedule view. The
  embed also needs the calendar shared publicly in Google's own settings
  (Settings → your calendar → Access permissions), separately from the
  OAuth connection — that's a Google-side privacy setting we can't set on
  the artist's behalf. Stays hidden in the UI until the OAuth env vars are
  set.
- Everything under `lib/` is plain TypeScript with no Next.js-specific
  imports, so `npx tsx lib/pricingEngine.test.ts` works standalone even
  before the rest of the app is scaffolded.

## Setting up transactional email (Resend)

1. Sign up at [resend.com](https://resend.com) (free tier covers local dev
   and small-scale use).
2. **API Keys → Create API Key** — copy it into `.env` as `RESEND_API_KEY`.
3. That alone is enough to send from `onboarding@resend.dev`, but on an
   unverified account Resend restricts this sender to **only the email
   address you signed up with** — any other recipient gets rejected with
   an error. That's fine for testing against your own inbox, but real
   clients won't receive anything until you verify a sending domain
   (**Domains → Add Domain**, then add the DNS records Resend gives you)
   and set `RESEND_FROM_EMAIL` to an address on it — this is required
   before going live, not just a spam/branding nicety.
4. Restart the dev server. No code changes needed — the three emails in
   `lib/email.ts` start sending as soon as the key is present.

## Setting up Google Calendar

This needs an OAuth app registered with Google — you do this once, in your
own Google account, then put the credentials in `.env`.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a new project (or pick an existing one).
2. **APIs & Services → Library** — search for "Google Calendar API" and
   enable it.
3. **APIs & Services → OAuth consent screen** — choose **External**, fill
   in the required fields (app name, your email). Under **Scopes**, add
   both `.../auth/calendar.freebusy` (reads busy/free, for blocking slots)
   and `.../auth/calendar.events` (creates/deletes the events this app
   pushes — never reads other events' details). While the app is
   unverified, add your own Google account under **Test users** — only
   test users can complete the OAuth flow until the app passes Google's
   verification review, which isn't needed for personal/local use, but
   does mean every other artist needs to be added as a test user (or the
   app verified) before they can connect their own calendar.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   — Application type **Web application**. Under **Authorized redirect
   URIs**, add:
   - `http://localhost:3000/api/auth/google-calendar/callback` for local dev
   - `https://yourdomain.com/api/auth/google-calendar/callback` once deployed
5. Copy the **Client ID** and **Client Secret** it gives you into `.env` as
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. Restart the dev server. "Connect Google Calendar" will appear on the
   dashboard Calendar tab. Anyone who connected before this scope change
   needs to disconnect and reconnect — their existing connection doesn't
   have permission to create events yet.

Each artist connects their own calendar independently — this is one app
registration shared by everyone using the platform, not a per-artist setup.
