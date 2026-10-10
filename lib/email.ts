import { Resend } from "resend";
import { googleCalendarUrl } from "./googleCalendar";

/**
 * Shared send path for every transactional email in this file. Centralizes
 * two things worth getting right exactly once rather than per-callsite:
 *  - the SDK resolves with { data, error } on API failures (bad key,
 *    unverified sending domain, etc.) instead of rejecting, so an unchecked
 *    `error` field means a silently-lost email with nothing for a caller to
 *    catch.
 *  - no RESEND_API_KEY shouldn't break the feature it's attached to (a
 *    submission, a booking) — it should just skip the email and say why.
 */
async function send(params: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY is not set — skipping email to ${params.to}: ${params.subject}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    // `||` deliberately, not `??` — RESEND_FROM_EMAIL="" (unset in .env,
    // copied verbatim from .env.example) must also fall back to the
    // default, not send with an empty from address.
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Submission received — the only immediate confirmation a client gets for
// YELLOW/RED outcomes, since GREEN is the one case where they're already
// looking at a live booking screen in the same session.
// ---------------------------------------------------------------------------

const STATUS_COPY: Record<
  "GREEN_AUTO_BOOKABLE" | "YELLOW_ARTIST_REVIEW" | "RED_CONSULTATION_REQUIRED",
  (artistName: string) => string
> = {
  GREEN_AUTO_BOOKABLE: () => "Your estimate is ready — you can pick a time right now.",
  YELLOW_ARTIST_REVIEW: (artistName) =>
    `${artistName} will take a quick look before confirming a price. You'll hear back by email.`,
  RED_CONSULTATION_REQUIRED: () =>
    "This one needs a quick consultation before pricing — you can book that now.",
};

export async function sendSubmissionReceivedEmail(params: {
  to: string;
  artistName: string;
  status: "GREEN_AUTO_BOOKABLE" | "YELLOW_ARTIST_REVIEW" | "RED_CONSULTATION_REQUIRED";
  priceLow?: number | null;
  priceHigh?: number | null;
}) {
  const { to, artistName, status, priceLow, priceHigh } = params;
  const hasRange = priceLow != null && priceHigh != null;

  await send({
    to,
    subject: `${artistName} received your tattoo request`,
    html: `
      <p>Thanks for your tattoo request to ${artistName}.</p>
      ${
        hasRange
          ? `<p>Estimated price: <strong>$${priceLow!.toFixed(0)}&ndash;$${priceHigh!.toFixed(0)}</strong></p>`
          : ""
      }
      <p>${STATUS_COPY[status](artistName)}</p>
    `,
  });
}

// ---------------------------------------------------------------------------
// Booking confirmation — fires once a slot (tattoo or consultation) is
// actually booked, independent of whether the client is still looking at
// the confirmation screen that triggered it.
// ---------------------------------------------------------------------------

export async function sendBookingConfirmationEmail(params: {
  to: string;
  artistName: string;
  type: "TATTOO" | "CONSULTATION";
  startTime: Date;
  endTime: Date;
  depositAmount?: number | null;
  depositInstructions?: string | null;
}) {
  const { to, artistName, type, startTime, endTime, depositAmount, depositInstructions } = params;
  const label = type === "TATTOO" ? "tattoo appointment" : "consultation";
  const calendarUrl = googleCalendarUrl({
    title: type === "TATTOO" ? "Tattoo appointment" : "Consultation",
    start: startTime,
    end: endTime,
  });

  const depositBlock =
    type === "TATTOO" && depositAmount != null && depositAmount > 0
      ? `
        <p><strong>Deposit due: $${depositAmount.toFixed(0)}</strong></p>
        <p>${depositInstructions || "Your artist will follow up with payment details."}</p>
        <p style="color:#666;font-size:13px;">Your slot is held, but not confirmed until the artist marks your deposit as received.</p>
      `
      : "";

  await send({
    to,
    subject: `You're booked with ${artistName}`,
    html: `
      <p>You're booked for a ${label} with ${artistName}.</p>
      <p><strong>${fmtDateTime(startTime)}</strong></p>
      <p><a href="${calendarUrl}">Add to Google Calendar</a></p>
      ${depositBlock}
    `,
  });
}

// ---------------------------------------------------------------------------
// Approval — fires after an artist approves a YELLOW/RED-reviewed
// submission; it's the only way the client finds out their booking link is
// now live, since they've long since left the intake flow by the time a
// human reviews it.
// ---------------------------------------------------------------------------

export async function sendApprovalEmail(params: {
  to: string;
  artistName: string;
  priceLow: number;
  priceHigh: number;
  bookingUrl: string;
}) {
  const { to, artistName, priceLow, priceHigh, bookingUrl } = params;

  await send({
    to,
    subject: `${artistName} approved your tattoo estimate`,
    html: `
      <p>Good news — ${artistName} reviewed your tattoo request and approved an estimate of <strong>$${priceLow.toFixed(0)}&ndash;$${priceHigh.toFixed(0)}</strong>.</p>
      <p><a href="${bookingUrl}">Pick a time to book your appointment</a>.</p>
    `,
  });
}
