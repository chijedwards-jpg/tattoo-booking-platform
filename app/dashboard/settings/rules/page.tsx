import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BookingRulesForm } from "../SettingsForm";
import { RestrictionsForm } from "../StylesAndRestrictions";

export const dynamic = "force-dynamic";

export default async function RulesSettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const [bookingRules, restrictions] = await Promise.all([
    prisma.bookingRules.findUnique({ where: { artistId } }),
    prisma.artistRestriction.findMany({ where: { artistId } }),
  ]);
  if (!bookingRules) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Booking rules</h1>
      <p className="mt-1 text-sm text-grey">
        Thresholds that decide whether a submission auto-books, needs your
        review, or needs a consultation.
      </p>
      <div className="mt-6">
        <BookingRulesForm bookingRules={bookingRules} />
      </div>

      <h2 className="mb-1 mt-10 font-display text-xl text-ink">Restrictions</h2>
      <p className="mb-4 text-sm text-grey">
        Placements and styles you won't do — these force a submission to
        need a consultation instead of auto-booking.
      </p>
      <RestrictionsForm restrictions={restrictions} />
    </div>
  );
}
