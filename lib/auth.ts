import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SESSION_COOKIE = "artist_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set in .env");
  }
  return secret;
}

// --- Passwords -------------------------------------------------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- Sessions ----------------------------------------------------------------
//
// A session is just the artist's ID plus an HMAC signature, so we don't need
// a database table or an external session-store service. Anyone can read the
// cookie's contents, but they can't forge a valid signature without the
// server's secret, so it can't be tampered with.

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function makeSessionToken(artistId: string): string {
  const signature = sign(artistId);
  return `${artistId}.${signature}`;
}

function verifySessionToken(token: string): string | null {
  const [artistId, signature] = token.split(".");
  if (!artistId || !signature) return null;

  const expected = sign(artistId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return artistId;
}

export async function createSession(artistId: string) {
  const token = makeSessionToken(artistId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Returns the logged-in artist's ID, or null if not logged in / invalid session. */
export async function getSessionArtistId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
