import { Resend } from "resend";

/**
 * Fire this after an artist approves a YELLOW/RED-reviewed submission — it's
 * the only way the client finds out their booking link is now live, since
 * they've long since left the intake flow by the time a human reviews it.
 */
export async function sendApprovalEmail(params: {
  to: string;
  artistName: string;
  priceLow: number;
  priceHigh: number;
  bookingUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY is not set — skipping approval email to ${params.to}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { to, artistName, priceLow, priceHigh, bookingUrl } = params;

  // The SDK resolves with { data, error } on API failures (bad key, unverified
  // domain, etc.) rather than rejecting — an unchecked `error` field means a
  // silently-lost email with no exception for a caller to catch.
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to,
    subject: `${artistName} approved your tattoo estimate`,
    html: `
      <p>Good news — ${artistName} reviewed your tattoo request and approved an estimate of <strong>$${priceLow.toFixed(0)}&ndash;$${priceHigh.toFixed(0)}</strong>.</p>
      <p><a href="${bookingUrl}">Pick a time to book your appointment</a>.</p>
    `,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }
}
