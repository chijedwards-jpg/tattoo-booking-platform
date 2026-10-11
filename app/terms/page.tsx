export const metadata = { title: "Terms of Service" };

const EFFECTIVE_DATE = "October 10, 2026";
const CONTACT_EMAIL = "chijedwards@gmail.com";

export default function TermsPage() {
  return (
    <main className="bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-4xl text-ink">Terms of Service</h1>
        <p className="mt-2 text-sm text-grey">Effective {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink">
          <section>
            <p>
              These Terms of Service ("Terms") govern your use of Tattoo Booking Platform (the
              "Platform"), operated by Tattoo Booking Platform ("we," "us"). By creating an
              account, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">1. What the Platform is</h2>
            <p className="mt-2">
              The Platform lets tattoo artists and shops ("Artists," "you") create a public
              booking page where their clients can submit tattoo requests, receive AI-generated
              price estimates, and book appointments. We provide the software — we are not a
              party to, and have no responsibility for, the tattooing services an Artist provides
              to their clients, including pricing, quality, scheduling conflicts outside the
              Platform, health and safety practices, or licensing.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">2. Your account</h2>
            <p className="mt-2">
              You're responsible for the accuracy of the information on your account and booking
              page, for keeping your login credentials secure, and for all activity under your
              account. You must be legally able to provide tattooing services in your
              jurisdiction to use the Platform as an Artist.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">3. Subscription & billing</h2>
            <p className="mt-2">
              Artist accounts are billed on a recurring monthly subscription through Stripe,
              currently $29/month, after a 14-day free trial. Your trial converts to a paid
              subscription automatically unless you cancel before it ends. You can cancel anytime
              from your dashboard's Billing page — your account remains active through the end of
              the current billing period. We may change pricing with advance notice to active
              subscribers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">4. AI-generated estimates</h2>
            <p className="mt-2">
              Price estimates and complexity/routing decisions shown to clients are generated
              automatically from a photo and description using an AI model, based on rules and
              rates each Artist configures. Estimates are not guaranteed to be accurate, and
              final pricing is always up to the Artist. We aren't liable for any pricing
              discrepancy, lost business, or client dispute arising from an estimate.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">5. Deposits</h2>
            <p className="mt-2">
              The Platform does not process payments between Artists and their clients. Deposit
              instructions (e.g. Venmo, CashApp, PayPal) are provided by the Artist and shown
              directly to the client; any transfer of money happens entirely outside the
              Platform, between the Artist and their client. We have no visibility into, and no
              responsibility for, whether a deposit is actually sent or received — that's tracked
              manually by the Artist.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">6. Acceptable use</h2>
            <p className="mt-2">
              Don't use the Platform to collect information from people under the age of 18
              without appropriate consent, to misrepresent your identity or qualifications, to
              send spam, or to attempt to access another Artist's account or data. We may suspend
              or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">7. Third-party services</h2>
            <p className="mt-2">
              The Platform relies on third-party services to function — including Stripe
              (billing), Google (calendar sync, AI image analysis), and Resend (email delivery).
              Your use of the Platform is also subject to those providers' own terms, and we
              aren't responsible for their outages or errors.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">8. Disclaimer & limitation of liability</h2>
            <p className="mt-2">
              The Platform is provided "as is," without warranties of any kind. To the fullest
              extent permitted by law, we aren't liable for indirect, incidental, or
              consequential damages arising from your use of the Platform, including lost
              revenue, lost bookings, or client disputes. Our total liability for any claim is
              limited to the amount you paid us in the three months before the claim arose.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">9. Termination</h2>
            <p className="mt-2">
              You can stop using the Platform and cancel your subscription at any time. We may
              suspend or terminate an account for violating these Terms or for non-payment, after
              reasonable notice where practical.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">10. Changes to these Terms</h2>
            <p className="mt-2">
              We may update these Terms from time to time. We'll post the updated version here
              with a new effective date; continuing to use the Platform after a change means you
              accept the update.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">11. Governing law</h2>
            <p className="mt-2">
              These Terms are governed by the laws of the State of Utah, without regard to
              conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">12. Contact</h2>
            <p className="mt-2">
              Questions about these Terms? Email{" "}
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
