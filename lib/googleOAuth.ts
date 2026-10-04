import { prisma } from "./db";
import { encrypt, decrypt } from "./crypto";
import type { BusyInterval } from "./availability";

// calendar.freebusy is the minimal scope for "is this artist busy at this
// time" — it shows the artist a less alarming consent screen than
// calendar.readonly (which grants event titles, attendees, locations) and
// we genuinely never need event details, only busy/free.
const SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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

/** Persists tokens from a fresh OAuth grant. */
export async function saveConnection(params: {
  artistId: string;
  refreshToken: string;
  accessToken: string;
  expiresIn: number;
  calendarId?: string;
}) {
  const { artistId, refreshToken, accessToken, expiresIn, calendarId = "primary" } = params;
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
      console.error(`Google freebusy request failed for artist ${artistId}: ${res.status}`);
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
