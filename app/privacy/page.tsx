export const metadata = { title: "Privacy Policy" };

const EFFECTIVE_DATE = "October 10, 2026";
const CONTACT_EMAIL = "chijedwards@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-grey">Effective {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink">
          <section>
            <p>
              This Privacy Policy explains what information Tattoo Booking Platform (the
              "Platform," "we," "us") collects, how we use it, and who we share it with. It
              applies to both Artists who run a dashboard on the Platform and clients who submit
              a tattoo request through an Artist's booking page.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">1. Information we collect</h2>
            <p className="mt-2 font-medium">From Artists:</p>
            <p className="mt-1">
              Name, email, password (stored as a one-way hash, never in plain text), booking page
              URL, bio, location, pricing and booking-rule settings, and — if you choose to
              connect them — your Google Calendar OAuth tokens (encrypted at rest) and Stripe
              billing information.
            </p>
            <p className="mt-3 font-medium">From clients submitting a tattoo request:</p>
            <p className="mt-1">
              Email address, tattoo description and placement, reference photos, and the
              appointment time you book. Reference photos and descriptions are sent to a
              third-party AI model to generate a price estimate — see Section 3.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">2. How we use it</h2>
            <p className="mt-2">
              To operate the booking flow itself: generating price estimates, showing available
              slots, sending confirmation emails, and giving Artists a dashboard to manage
              submissions and appointments. We also use Artist contact info for billing and
              account-related communication. We don't sell personal data, and we don't use client
              submission data (photos, descriptions) for anything beyond generating that client's
              own estimate.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">3. Third parties we share data with</h2>
            <p className="mt-2">
              We rely on a small number of service providers to run the Platform, each of which
              processes data on our behalf under their own privacy/security terms:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <span className="font-medium">Stripe</span> — processes Artist subscription
                payments. We never see or store your full card number.
              </li>
              <li>
                <span className="font-medium">Google</span> — if an Artist connects their
                calendar, we read free/busy status only (never event details) to block booked
                times. A tattoo request's reference photo and description are also sent to
                Google's Gemini AI model to generate a price estimate.
              </li>
              <li>
                <span className="font-medium">Resend</span> — sends transactional emails
                (submission confirmations, booking confirmations) on our behalf.
              </li>
              <li>
                <span className="font-medium">Neon</span> — hosts our Postgres database.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">4. Cookies</h2>
            <p className="mt-2">
              We use a single, necessary session cookie to keep Artists logged into their
              dashboard. It's signed to prevent tampering and isn't used for advertising or
              tracking. Clients submitting a tattoo request don't get an account or a login
              cookie.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">5. Data retention</h2>
            <p className="mt-2">
              We keep account and submission data for as long as the account is active, plus a
              reasonable period afterward for records and legal compliance. You can request
              deletion of your data — see Section 7.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">6. Security</h2>
            <p className="mt-2">
              Passwords are hashed, never stored in plain text. Google Calendar refresh tokens
              are encrypted at rest. No system is perfectly secure, but we take reasonable steps
              to protect your data against unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">7. Your rights</h2>
            <p className="mt-2">
              You can ask us to access, correct, or delete the personal data we hold about you by
              emailing{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink-red underline">
                {CONTACT_EMAIL}
              </a>
              . Artists can also update or remove most of their own information directly from
              their dashboard settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">8. Children's privacy</h2>
            <p className="mt-2">
              The Platform isn't directed at children, and tattoo services generally require
              clients to be adults (or have parental involvement, per local law and the Artist's
              own policies). We don't knowingly collect data from children under 13.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">9. Changes to this policy</h2>
            <p className="mt-2">
              We may update this policy from time to time. We'll post the updated version here
              with a new effective date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">10. Contact</h2>
            <p className="mt-2">
              Questions about this policy? Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink-red underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
