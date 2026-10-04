import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getSessionArtistId } from "@/lib/auth";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from "@/lib/googleOAuth";

const STATE_COOKIE = "google_oauth_state";

/**
 * Kicks off the OAuth flow. The random state is stashed in a short-lived
 * cookie (not keyed to the artist) rather than encoding the artist ID in
 * state itself — the callback reads who's connecting from the artist's own
 * session, which is simpler and doesn't need the state to be anything more
 * than an unguessable CSRF check.
 */
export async function GET() {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google Calendar integration is not configured on this server." },
      { status: 503 }
    );
  }

  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes — just needs to survive the round trip to Google and back
    path: "/",
  });

  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
