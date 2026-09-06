import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PricingForm, BookingRulesForm } from "./SettingsForm";
import { StylesForm, RestrictionsForm } from "./StylesAndRestrictions";
import { AvailabilityForm } from "./AvailabilityForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      pricingConfig: true,
      bookingRules: true,
      styles: { orderBy: { name: "asc" } },
      restrictions: true,
      // One-off date overrides (vacation days, etc.) aren't wired into the
      // slot calculation yet — only show the weekly recurring windows that
      // actually drive booking today.
      availability: { where: { dayOfWeek: { not: null } } },
    },
  });

  if (!artist || !artist.pricingConfig || !artist.bookingRules) redirect("/login");

  return (
    <main className="min-h-screen bg-ink text-paper">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/dashboard" className="text-sm text-paper/50 hover:text-paper">
          ← All submissions
        </Link>

        <h1 className="mt-4 font-display text-3xl text-paper">Settings</h1>
        <p className="mt-1 text-sm text-paper/50">{artist.name}</p>

        <section className="mt-8">
          <h2 className="font-display text-xl text-paper">Pricing & deposit</h2>
          <p className="mt-1 text-sm text-paper/50">
            How estimates are priced and what clients pay to hold a slot.
          </p>
          <div className="mt-4">
            <PricingForm pricingConfig={artist.pricingConfig} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl text-paper">Booking rules</h2>
          <p className="mt-1 text-sm text-paper/50">
            Thresholds that decide whether a submission auto-books, needs your
            review, or needs a consultation.
          </p>
          <div className="mt-4">
            <BookingRulesForm bookingRules={artist.bookingRules} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl text-paper">Availability</h2>
          <p className="mt-1 text-sm text-paper/50">
            Weekly recurring hours clients can book into. One-off blocked
            days (vacation, etc.) aren't supported yet.
          </p>
          <div className="mt-4">
            <AvailabilityForm blocks={artist.availability} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl text-paper">Tattoo styles</h2>
          <p className="mt-1 text-sm text-paper/50">
            Time multipliers applied to the AI's base hour estimate. Inactive
            styles are kept for history but no longer applied to new
            submissions.
          </p>
          <div className="mt-4">
            <StylesForm styles={artist.styles} />
          </div>
        </section>

        <section className="mt-10 mb-10">
          <h2 className="font-display text-xl text-paper">Restrictions</h2>
          <p className="mt-1 text-sm text-paper/50">
            Placements and styles you won't do — these force a submission to
            need a consultation instead of auto-booking.
          </p>
          <div className="mt-4">
            <RestrictionsForm restrictions={artist.restrictions} />
          </div>
        </section>
      </div>
    </main>
  );
}
