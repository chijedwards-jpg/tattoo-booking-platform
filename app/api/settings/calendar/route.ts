import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { parseGoogleCalendarId } from "@/lib/googleCalendar";

const CalendarSchema = z.object({
  // Whatever the artist pasted: a calendar ID, a public URL, or a full
  // <iframe> snippet. Parsed down to an ID below; null disconnects.
  input: z.string().nullable(),
});

export async function PATCH(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CalendarSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let googleCalendarId: string | null = null;

  if (parsed.data.input !== null && parsed.data.input.trim() !== "") {
    googleCalendarId = parseGoogleCalendarId(parsed.data.input);
    // Never fall back to the raw input — it ends up in an iframe URL.
    if (!googleCalendarId) {
      return NextResponse.json(
        {
          error:
            "That doesn't look like a Google Calendar. Paste your calendar's ID, public URL, or embed code.",
        },
        { status: 400 }
      );
    }
  }

  const artist = await prisma.artist.update({
    where: { id: artistId },
    data: { googleCalendarId },
  });

  return NextResponse.json({ googleCalendarId: artist.googleCalendarId });
}
