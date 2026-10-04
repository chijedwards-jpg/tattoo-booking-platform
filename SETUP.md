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
- Deposits aren't processed by this app — a tattoo appointment is booked
  immediately (no payment gate), and the client is shown the artist's own
  payment instructions (Venmo/CashApp/PayPal/etc, set in Settings → Pricing
  & deposit). The artist marks the deposit received from the submission's
  page in the dashboard once it actually arrives.
- Linking a Google Calendar (dashboard → Calendar) is **display only**: it
  embeds a read-only view next to the app's own bookings. It does not sync —
  it won't block booked times from being offered to clients, and bookings
  made here don't appear on it. The calendar must be shared publicly in
  Google Calendar's settings, or the embed renders blank for anyone not
  already signed into that Google account.
- Everything under `lib/` is plain TypeScript with no Next.js-specific
  imports, so `npx tsx lib/pricingEngine.test.ts` works standalone even
  before the rest of the app is scaffolded.
