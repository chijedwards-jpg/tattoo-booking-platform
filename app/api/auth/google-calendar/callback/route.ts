import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionArtistId } from "@/lib/auth";
import { exchangeCodeForTokens, saveConnection } from "@/lib/googleOAuth";

const STATE_COOKIE = "google_oauth_state";

function redirectTo(status: "connected" | "error", req: NextRequest) {
  const url = new URL("/dashboard/calendar", process.env.NEXT_PUBLIC_APP_URL ?? req.url);
  url.searchParams.set("google", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? req.url));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const googleError = req.nextUrl.searchParams.get("error"); // e.g. "access_denied" if the artist declined

  if (googleError || !code || !state || !expectedState || state !== expectedState) {
    return redirectTo("error", req);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Happens if the artist had already granted consent before and
      // Google didn't re-issue a refresh_token despite prompt=consent — a
      // reconnect attempt should still get one, but guard against it
      // silently "succeeding" with nothing persisted.
      return redirectTo("error", req);
    }
    await saveConnection({
      artistId,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });
    return redirectTo("connected", req);
  } catch (err) {
    console.error("Google Calendar OAuth callback failed:", err);
    return redirectTo("error", req);
  }
}
