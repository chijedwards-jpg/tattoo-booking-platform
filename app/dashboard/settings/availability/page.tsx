import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { AvailabilityForm } from "../AvailabilityForm";
import { TimeZoneForm } from "../TimeZoneForm";
import { DaysOffForm } from "../DaysOffForm";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";
import { MIN_BOOKING_NOTICE_HOURS } from "@/lib/slots";

export const dynamic = "force-dynamic";

export default async function AvailabilitySettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { timeZone: true },
  });
  const timeZone = artist?.timeZone ?? DEFAULT_TIME_ZONE;
  const today = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");

  const [blocks, daysOff] = await Promise.all([
    prisma.availabilityBlock.findMany({ where: { artistId, dayOfWeek: { not: null } } }),
    prisma.availabilityBlock.findMany({
      where: { artistId, isBlocked: true, date: { gte: new Date(`${today}T00:00:00Z`) } },
      orderBy: { date: "asc" },
      select: { id: true, date: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Availability</h1>
      <p className="mt-1 text-sm text-grey">
        Weekly hours clients can book into. Clients can book up to two weeks ahead, and no sooner than{" "}
        {MIN_BOOKING_NOTICE_HOURS} hours before a slot starts.
      </p>
      <div className="mt-6">
        <TimeZoneForm timeZone={timeZone} />
      </div>
      <div className="mt-6">
        <AvailabilityForm blocks={blocks} />
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl text-ink">Days off</h2>
      <DaysOffForm
        today={today}
        initial={daysOff.map((d) => ({ id: d.id, date: d.date!.toISOString().slice(0, 10) }))}
      />
    </div>
  );
}
