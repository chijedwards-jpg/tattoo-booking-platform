import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const START_HOUR = 9;
const END_HOUR = 21;
const ROW_HEIGHT = 32; // px per hour

function fmtDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default async function CalendarPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const appointments = await prisma.appointment.findMany({
    where: {
      artistId,
      status: "SCHEDULED",
      startTime: { gte: rangeStart, lt: rangeEnd },
    },
    include: { client: true },
    orderBy: { startTime: "asc" },
  });

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => START_HOUR + i);

  function appointmentsFor(day: Date) {
    return appointments.filter((a) => a.startTime.toDateString() === day.toDateString());
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Calendar</h1>
      <p className="mt-1 text-sm text-grey">The next 7 days.</p>

      <div className="mt-4 flex items-center gap-4 text-xs text-grey">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-ink-red" /> Tattoo appointment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-pine" /> Consultation
        </span>
      </div>

      {appointments.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-grey">
          Nothing scheduled in the next 7 days.
        </div>
      )}

      <div className="mt-4 grid grid-cols-7 gap-2 overflow-x-auto">
        {days.map((day) => (
          <div key={day.toDateString()} className="min-w-[110px] overflow-hidden rounded-xl border border-line bg-card">
            <div className="bg-paper-alt py-2 text-center font-mono text-xs">{fmtDay(day)}</div>
            <div className="relative" style={{ height: (END_HOUR - START_HOUR) * ROW_HEIGHT }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-line"
                  style={{ top: (h - START_HOUR) * ROW_HEIGHT }}
                />
              ))}
              {appointmentsFor(day).map((a) => {
                const startFrac =
                  a.startTime.getHours() + a.startTime.getMinutes() / 60 - START_HOUR;
                const durationHours = (a.endTime.getTime() - a.startTime.getTime()) / 3_600_000;
                const top = startFrac * ROW_HEIGHT;
                const height = Math.max(20, durationHours * ROW_HEIGHT);
                // Tailwind's compiler needs complete literal class strings —
                // it can't pick up a class built from an interpolated
                // variable — so branch to two full strings instead of
                // constructing one from `color`.
                const colorClasses =
                  a.type === "CONSULTATION"
                    ? "border-pine bg-pine/10"
                    : "border-ink-red bg-ink-red/10";
                return (
                  <div
                    key={a.id}
                    className={`absolute left-1 right-1 overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-[10px] leading-tight ${colorClasses}`}
                    style={{ top, height }}
                  >
                    <p className="truncate font-medium text-ink">{a.client.email}</p>
                    <p className="text-grey">{fmtTime(a.startTime)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
