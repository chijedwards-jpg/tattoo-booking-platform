import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazily constructed — importing this file must not throw when the key isn't set yet. */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** Subscription statuses that should keep the dashboard unlocked. */
export function hasActiveSubscriptionAccess(status: string | null): boolean {
  return status === "trialing" || status === "active";
}

const TRIAL_PERIOD_DAYS = 14;

export async function createSubscriptionCheckoutSession(params: {
  artistId: string;
  email: string;
  stripeCustomerId: string | null;
}): Promise<string> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set in .env");

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: params.artistId,
    // Reuse the existing Stripe customer on re-subscribe (e.g. after a
    // canceled plan) instead of creating a duplicate customer record.
    ...(params.stripeCustomerId
      ? { customer: params.stripeCustomerId }
      : { customer_email: params.email }),
    subscription_data: { trial_period_days: TRIAL_PERIOD_DAYS },
    success_url: `${appUrl}/api/billing/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createBillingPortalSession(stripeCustomerId: string): Promise<string> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const session = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/dashboard/settings/billing`,
  });
  return session.url;
}
