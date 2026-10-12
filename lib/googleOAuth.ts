import { prisma } from "./db";
import { encrypt, decrypt } from "./crypto";
import type { BusyInterval } from "./availability";

// calendar.freebusy reads busy/free only (no event details); calendar.events
// is scoped to creating/reading/deleting events, not broader calendar
// management (renaming calendars, changing sharing, etc). openid + the
// userinfo.email scope exist only so Google's token response includes an ID
// token with the artist's email — that email IS their primary calendar's ID,
// so this avoids a separate calendars.get call, which needs a broader
// calendar.readonly/calendar scope neither of the above two scopes cover.
// Together this is still deliberately narrower than calendar.readonly or
// calendar (which would also hand us every other event's title, attendees,
// and location).
const SCOPE =
  "openid email https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars";

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set in .env");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/auth/google-calendar/callback`,
  };
}

/** Whether the OAuth app is configured at all — used to hide the "block busy times" UI until it is. */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getConfig();
  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // required to get a refresh_token
    prompt: "consent", // force refresh_token on reconnect too, not just first grant
    state,
  });
  return `${AUTH_URL}?${qs.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/**
 * Pulls the `email` claim out of Google's ID token (a JWT). No signature
 * verification — this token came directly from Google's own token endpoint
 * over HTTPS in the same request we're already trusting for the access/
 * refresh tokens, not from a third party claiming to be Google, so there's
 * nothing independent to verify it against here.
 */
export function emailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return typeof decoded.email === "string" ? decoded.email : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/**
 * Returns a usable access token for the artist's connection, refreshing
 * it first if it's missing or close to expiry. Returns null if the artist
 * isn't connected, or if the connection is dead (refresh token revoked) —
 * callers must treat null as "skip Google busy times", not throw, since a
 * stale connection shouldn't break booking entirely.
 */
export async function getValidAccessToken(artistId: string): Promise<string | null> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { artistId } });
  if (!connection) return null;

  const stillValid =
    connection.accessToken &&
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000; // 1 min buffer

  if (stillValid) return connection.accessToken!;

  try {
    const refreshToken = decrypt(connection.encryptedRefreshToken);
    const tokens = await refreshAccessToken(refreshToken);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await prisma.googleCalendarConnection.update({
      where: { artistId },
      data: { accessToken: tokens.access_token, accessTokenExpiresAt: expiresAt },
    });
    return tokens.access_token;
  } catch (err) {
    // Access revoked from the Google side, expired refresh token, etc. —
    // log it, but let the caller fall back to "no Google busy data" rather
    // than failing the whole availability lookup.
    console.error(`Google Calendar refresh failed for artist ${artistId}:`, err);
    return null;
  }
}

/**
 * Persists tokens from a fresh OAuth grant. calendarId is the artist's real
 * calendar ID (their email, for a normal Google account, pulled from the ID
 * token — see emailFromIdToken) rather than the literal string "primary":
 * the freebusy/events APIs accept either, but the public embed iframe only
 * works with the real ID, so storing it means one value serves both and the
 * artist never has to go find and paste it themselves.
 */
export async function saveConnection(params: {
  artistId: string;
  refreshToken: string;
  accessToken: string;
  expiresIn: number;
  calendarId: string;
}) {
  const { artistId, refreshToken, accessToken, expiresIn, calendarId } = params;
  await prisma.googleCalendarConnection.upsert({
    where: { artistId },
    create: {
      artistId,
      calendarId,
      encryptedRefreshToken: encrypt(refreshToken),
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    },
    update: {
      calendarId,
      encryptedRefreshToken: encrypt(refreshToken),
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  });
}

/**
 * Busy intervals from the artist's Google Calendar over [timeMin, timeMax).
 * Returns [] (not null) on any failure — a dead connection or a failed API
 * call should degrade to "no extra busy times from Google" rather than
 * taking down the whole availability endpoint.
 */
export async function fetchGoogleBusyIntervals(
  artistId: string,
  timeMin: Date,
  timeMax: Date
): Promise<BusyInterval[]> {
  const accessToken = await getValidAccessToken(artistId);
  if (!accessToken) return [];

  const connection = await prisma.googleCalendarConnection.findUnique({ where: { artistId } });
  if (!connection) return [];

  try {
    const res = await fetch(FREEBUSY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: connection.calendarId }],
      }),
    });

    if (!res.ok) {
      console.error(`Google freebusy request failed for artist ${artistId}: ${res.status} ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    const busyRaw: { start: string; end: string }[] =
      data?.calendars?.[connection.calendarId]?.busy ?? [];

    return busyRaw.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch (err) {
    console.error(`Google freebusy request errored for artist ${artistId}:`, err);
    return [];
  }
}

/**
 * Pushes a booked appointment onto the artist's real Google Calendar.
 * Returns the created event's ID to store for later cancellation, or null
 * on any failure (not connected, revoked access, API error) — booking
 * itself must never fail because this push did.
 */
export async function createGoogleCalendarEvent(
  artistId: string,
  params: { summary: string; description?: string; start: Date; end: Date }
): Promise<string | null> {
  const accessToken = await getValidAccessToken(artistId);
  if (!accessToken) return null;

  const connection = await prisma.googleCalendarConnection.findUnique({ where: { artistId } });
  if (!connection) return null;

  try {
    const res = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(connection.calendarId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.start.toISOString() },
        end: { dateTime: params.end.toISOString() },
      }),
    });

    if (!res.ok) {
      console.error(`Google event create failed for artist ${artistId}: ${res.status} ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    return data.id ?? null;
  } catch (err) {
    console.error(`Google event create errored for artist ${artistId}:`, err);
    return null;
  }
}

/** Best-effort delete of a previously pushed event — never throws. */
export async function deleteGoogleCalendarEvent(artistId: string, eventId: string): Promise<void> {
  const accessToken = await getValidAccessToken(artistId);
  if (!accessToken) return;

  const connection = await prisma.googleCalendarConnection.findUnique({ where: { artistId } });
  if (!connection) return;

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    // 404/410 just means it's already gone (e.g. the artist deleted it
    // themselves on Google's side) — not worth logging as an error.
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error(`Google event delete failed for artist ${artistId}: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error(`Google event delete errored for artist ${artistId}:`, err);
  }
}
