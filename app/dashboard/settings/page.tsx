import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PricingForm, BookingRulesForm } from "./SettingsForm";
import { StylesForm, RestrictionsForm } from "./StylesAndRestrictions";
import { AvailabilityForm } from "./AvailabilityForm";
import { ProfileForm } from "./ProfileForm";

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
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Settings</h1>

      <section className="mt-8">
        <h2 className="font-display text-xl text-ink">Profile</h2>
        <p className="mt-1 text-sm text-grey">What clients see on your booking page.</p>
        <div className="mt-4">
          <ProfileForm artist={artist} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Pricing & deposit</h2>
        <p className="mt-1 text-sm text-grey">
          How estimates are priced and what clients pay to hold a slot.
        </p>
        <div className="mt-4">
          <PricingForm pricingConfig={artist.pricingConfig} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Booking rules</h2>
        <p className="mt-1 text-sm text-grey">
          Thresholds that decide whether a submission auto-books, needs your
          review, or needs a consultation.
        </p>
        <div className="mt-4">
          <BookingRulesForm bookingRules={artist.bookingRules} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Availability</h2>
        <p className="mt-1 text-sm text-grey">
          Weekly recurring hours clients can book into. One-off blocked
          days (vacation, etc.) aren't supported yet.
        </p>
        <div className="mt-4">
          <AvailabilityForm blocks={artist.availability} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Tattoo styles</h2>
        <p className="mt-1 text-sm text-grey">
          Time multipliers applied to the AI's base hour estimate. Inactive
          styles are kept for history but no longer applied to new
          submissions.
        </p>
        <div className="mt-4">
          <StylesForm styles={artist.styles} />
        </div>
      </section>

      <section className="mb-10 mt-10">
        <h2 className="font-display text-xl text-ink">Restrictions</h2>
        <p className="mt-1 text-sm text-grey">
          Placements and styles you won't do — these force a submission to
          need a consultation instead of auto-booking.
        </p>
        <div className="mt-4">
          <RestrictionsForm restrictions={artist.restrictions} />
        </div>
      </section>
    </div>
  );
}
