import { Sparkles, CalendarClock, Wallet, Globe } from "lucide-react";

const FEATURES = [
  {
    Icon: Sparkles,
    title: "Instant pricing estimates",
    body: "Clients submit a photo and description; you get an instant price range and a GREEN/YELLOW/RED routing decision — auto-bookable, needs your review, or needs a consult.",
  },
  {
    Icon: CalendarClock,
    title: "Google Calendar sync",
    body: "Connect your real calendar and busy times are automatically blocked from the slots clients can book — no double-bookings against your personal schedule.",
  },
  {
    Icon: Wallet,
    title: "Deposits, your way",
    body: "Clients see your own Venmo, CashApp, or PayPal info after booking. No payment processor fees — you confirm deposits yourself, right from the dashboard.",
  },
  {
    Icon: Globe,
    title: "Your own booking page",
    body: "Every artist gets a public page at yoursite.com/a/your-name — pricing rules, styles, availability, and booking policies, all set by you.",
  },
];

const STEPS = [
  { n: "1", title: "Sign up", body: "Create your account and pick your booking page URL. Takes under a minute." },
  { n: "2", title: "Set your rules", body: "Hourly rate, styles you do, booking thresholds, and your weekly availability." },
  { n: "3", title: "Share your link", body: "Send clients to your page. Requests, pricing, and booking happen automatically." },
];

function NavButton({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      className={
        primary
          ? "inline-flex items-center justify-center gap-2 rounded-full bg-ink-red px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          : "inline-flex items-center justify-center gap-2 rounded-full border border-ink px-5 py-2.5 text-sm text-ink transition-colors hover:bg-ink/5"
      }
    >
      {children}
    </a>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-paper text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg">Tattoo Booking Platform</span>
        <nav className="flex items-center gap-3">
          <NavButton href="/login">Log in</NavButton>
          <NavButton href="/signup" primary>
            Start free trial
          </NavButton>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-5xl leading-tight text-ink">
          Run your tattoo bookings on autopilot.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-grey">
          Pricing estimates, booking rules, calendar sync, and deposits — one page for your
          clients, one dashboard for you. Built for independent artists and shops.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <NavButton href="/signup" primary>
            Start your 14-day free trial
          </NavButton>
        </div>
        <p className="mt-3 text-xs text-grey">$29/month after your trial. Cancel anytime.</p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-line bg-card p-6">
              <Icon size={20} className="text-ink-red" />
              <h3 className="mt-3 font-display text-xl text-ink">{title}</h3>
              <p className="mt-2 text-sm text-grey">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-3xl text-ink">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-medium text-paper">
                {n}
              </div>
              <h3 className="mt-3 font-display text-lg text-ink">{title}</h3>
              <p className="mt-1 text-sm text-grey">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-sm px-6 py-16 text-center">
        <div className="rounded-2xl border border-line bg-card p-8">
          <p className="font-mono text-[11px] uppercase tracking-wide text-grey">One simple plan</p>
          <p className="mt-2 font-display text-4xl text-ink">$29<span className="text-lg text-grey">/mo</span></p>
          <p className="mt-1 text-sm text-grey">14-day free trial, then billed monthly.</p>
          <ul className="mt-5 space-y-2 text-left text-sm text-ink">
            <li>— Your own public booking page</li>
            <li>— Instant pricing estimates & routing</li>
            <li>— Google Calendar busy-time sync</li>
            <li>— Email notifications for you and clients</li>
            <li>— Cancel anytime from your dashboard</li>
          </ul>
          <div className="mt-6">
            <NavButton href="/signup" primary>
              Start free trial
            </NavButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-8 text-center text-xs text-grey">
        <p>Tattoo Booking Platform</p>
        <p className="mt-2 flex items-center justify-center gap-4">
          <a href="/terms" className="underline hover:text-ink">
            Terms of Service
          </a>
          <a href="/privacy" className="underline hover:text-ink">
            Privacy Policy
          </a>
        </p>
      </footer>
    </main>
  );
}
