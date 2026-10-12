import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { googleCalendarEmbedUrl } from "@/lib/googleCalendar";
import { isGoogleOAuthConfigured } from "@/lib/googleOAuth";
import GoogleBusyBlockConnect from "./GoogleBusyBlockConnect";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { google?: string };
}) {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { googleCalendarConnection: { select: { calendarId: true } } },
  });
  if (!artist) redirect("/login");

  const connection = artist.googleCalendarConnection;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Calendar</h1>
      <p className="mt-1 text-sm text-grey">
        Your Google Calendar is the only schedule this app keeps — connecting it blocks
        busy times from being offered to clients, and every booking made through your
        page is pushed there automatically.
      </p>

      {searchParams.google === "connected" && (
        <p className="mt-4 rounded-xl border border-pine/40 bg-pine/10 px-4 py-3 text-sm text-ink">
          Google Calendar connected — new bookings will be pushed there, and busy times
          will be kept off your bookable slots.
        </p>
      )}
      {searchParams.google === "error" && (
        <p className="mt-4 rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-ink">
          Couldn't connect your Google Calendar. Please try again.
        </p>
      )}

      <div className="mt-6">
        <GoogleBusyBlockConnect
          connected={Boolean(connection)}
          configured={isGoogleOAuthConfigured()}
        />
      </div>

      {connection ? (
        <iframe
          src={googleCalendarEmbedUrl(connection.calendarId)}
          title="Your Google Calendar"
          className="mt-6 h-[700px] w-full rounded-2xl border border-line bg-card"
          // Not sandboxed: Google Calendar's embed needs same-origin to
          // render, and the ID comes from the OAuth connection (resolved
          // from Google itself), never from user-supplied input.
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-grey">
          Connect your Google Calendar above to see your schedule here.
          <br />
          It also needs to be shared publicly for this preview to render —
          in Google Calendar: Settings → your calendar → Access permissions
          → "Make available to public."
        </div>
      )}
    </div>
  );
}
