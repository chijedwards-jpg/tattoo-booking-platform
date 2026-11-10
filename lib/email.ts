import { Resend } from "resend";
import type { MessageKind } from "@prisma/client";
import { prisma } from "./db";
import { googleCalendarUrl } from "./googleCalendar";

/**
 * Who a client email belongs to, so it lands in that client's message
 * history (MessageLog) on the artist's dashboard.
 */
export type MessageLogContext = {
  artistId: string;
  clientId: string;
  appointmentId?: string | null;
  kind: MessageKind;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Writing the history row must never break the send it describes.
async function logMessage(
  log: MessageLogContext,
  params: { to: string; subject: string },
  status: "SENT" | "FAILED" | "SKIPPED",
  error?: string
) {
  try {
    await prisma.messageLog.create({
      data: {
        artistId: log.artistId,
        clientId: log.clientId,
        appointmentId: log.appointmentId ?? null,
        kind: log.kind,
        to: params.to,
        subject: params.subject,
        status,
        error: error?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to record message history:", err);
  }
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#9b2c2c;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;">${label}</a>`;
}

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
async function send(params: { to: string; subject: string; html: string; log?: MessageLogContext }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY is not set — skipping email to ${params.to}: ${params.subject}`);
    if (params.log) await logMessage(params.log, params, "SKIPPED", "No email provider configured");
    return;
  }

  const resend = new Resend(apiKey);
  let error: { message: string } | null;
  try {
    ({ error } = await resend.emails.send({
      // `||` deliberately, not `??` — RESEND_FROM_EMAIL="" (unset in .env,
      // copied verbatim from .env.example) must also fall back to the
      // default, not send with an empty from address.
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: params.to,
      subject: params.subject,
      html: params.html,
    }));
  } catch (err) {
    error = { message: err instanceof Error ? err.message : String(err) };
  }

  if (error) {
    if (params.log) await logMessage(params.log, params, "FAILED", error.message);
    throw new Error(`Resend API error: ${error.message}`);
  }
  if (params.log) await logMessage(params.log, params, "SENT");
}

function fmtDateTime(d: Date, timeZone: string): string {
  return d.toLocaleString("en-US", {
    timeZone,
    timeZoneName: "short",
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
  log?: MessageLogContext;
}) {
  const { to, artistName, status, priceLow, priceHigh, log } = params;
  const hasRange = priceLow != null && priceHigh != null;

  await send({
    to,
    log,
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
  timeZone: string;
  depositAmount?: number | null;
  depositInstructions?: string | null;
  confirmUrl: string;
  log?: MessageLogContext;
}) {
  const { to, artistName, type, startTime, endTime, timeZone, depositAmount, depositInstructions, confirmUrl, log } =
    params;
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
    log,
    subject: `You're booked with ${artistName}`,
    html: `
      <p>You're booked for a ${label} with ${artistName}.</p>
      <p><strong>${fmtDateTime(startTime, timeZone)}</strong></p>
      <p>${button(confirmUrl, "Confirm I'll be there")}</p>
      <p style="color:#666;font-size:13px;">Can't make it? <a href="${confirmUrl}">Let ${artistName} know you need to reschedule</a>.</p>
      <p><a href="${calendarUrl}">Add to Google Calendar</a></p>
      ${depositBlock}
    `,
  });
}

// ---------------------------------------------------------------------------
// Reminder — sent by the daily cron (app/api/cron/reminders) on the days
// the artist picked in settings. Asks for a confirmation until the client
// has given one.
// ---------------------------------------------------------------------------

export async function sendReminderEmail(params: {
  to: string;
  artistName: string;
  type: "TATTOO" | "CONSULTATION";
  startTime: Date;
  timeZone: string;
  daysUntil: number;
  confirmed: boolean;
  confirmUrl: string;
  depositDue?: { amount: number; instructions: string | null } | null;
  log?: MessageLogContext;
}) {
  const { to, artistName, type, startTime, timeZone, daysUntil, confirmed, confirmUrl, depositDue, log } = params;
  const label = type === "TATTOO" ? "tattoo appointment" : "consultation";
  const when = daysUntil <= 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;

  const confirmBlock = confirmed
    ? `<p>You've confirmed. See you then! Need to change it? <a href="${confirmUrl}">Let ${artistName} know</a>.</p>`
    : `
      <p>${button(confirmUrl, "Confirm I'll be there")}</p>
      <p style="color:#666;font-size:13px;">Can't make it? <a href="${confirmUrl}">Ask to reschedule</a>.</p>
    `;

  const depositBlock = depositDue
    ? `<p><strong>Your $${depositDue.amount.toFixed(0)} deposit hasn't been marked received yet.</strong> ${
        depositDue.instructions ? escapeHtml(depositDue.instructions) : ""
      }</p>`
    : "";

  await send({
    to,
    log,
    subject: `Reminder: your ${label} with ${artistName} is ${when}`,
    html: `
      <p>Your ${label} with ${artistName} is ${when}:</p>
      <p><strong>${fmtDateTime(startTime, timeZone)}</strong></p>
      ${confirmBlock}
      ${depositBlock}
    `,
  });
}

// ---------------------------------------------------------------------------
// Review request — sent by the daily cron once a tattoo appointment is over.
// ---------------------------------------------------------------------------

export async function sendReviewRequestEmail(params: {
  to: string;
  artistName: string;
  reviewUrl: string;
  log?: MessageLogContext;
}) {
  const { to, artistName, reviewUrl, log } = params;
  await send({
    to,
    log,
    subject: `How was your tattoo with ${artistName}?`,
    html: `
      <p>Thanks for getting tattooed with ${artistName}! How did it go?</p>
      <p>${button(reviewUrl, "Leave a quick review")}</p>
      <p style="color:#666;font-size:13px;">It takes under a minute and helps ${artistName} a lot.</p>
    `,
  });
}

// ---------------------------------------------------------------------------
// Reschedule request — goes to the artist, not the client, when a client
// says through their link that they can't make it.
// ---------------------------------------------------------------------------

export async function sendRescheduleRequestToArtist(params: {
  to: string;
  clientLabel: string;
  startTime: Date;
  timeZone: string;
  note: string | null;
  clientPageUrl: string;
}) {
  const { to, clientLabel, startTime, timeZone, note, clientPageUrl } = params;
  await send({
    to,
    subject: `${clientLabel} needs to reschedule`,
    html: `
      <p>${escapeHtml(clientLabel)} asked to reschedule their appointment on <strong>${fmtDateTime(startTime, timeZone)}</strong>.</p>
      ${note ? `<p>Their message: &ldquo;${escapeHtml(note)}&rdquo;</p>` : ""}
      <p>The appointment is still on your calendar. Cancel it from their client page once you've sorted out a new time.</p>
      <p><a href="${clientPageUrl}">Open their client page</a></p>
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
  log?: MessageLogContext;
}) {
  const { to, artistName, priceLow, priceHigh, bookingUrl, log } = params;

  await send({
    to,
    log,
    subject: `${artistName} approved your tattoo estimate`,
    html: `
      <p>Good news — ${artistName} reviewed your tattoo request and approved an estimate of <strong>$${priceLow.toFixed(0)}&ndash;$${priceHigh.toFixed(0)}</strong>.</p>
      <p><a href="${bookingUrl}">Pick a time to book your appointment</a>.</p>
    `,
  });
}
