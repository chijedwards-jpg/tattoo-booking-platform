import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";

export async function POST() {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const connection = await prisma.googleCalendarConnection.findUnique({ where: { artistId } });
  if (connection) {
    // Best-effort revoke on Google's side too, so the artist's Google
    // account page stops listing this app as connected. Not fatal if it
    // fails (already revoked, network blip) — we still remove our copy.
    try {
      const refreshToken = decrypt(connection.encryptedRefreshToken);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: "POST",
      });
    } catch (err) {
      console.error(`Google token revoke failed for artist ${artistId}:`, err);
    }

    await prisma.googleCalendarConnection.delete({ where: { artistId } });
  }

  return NextResponse.json({ ok: true });
}
