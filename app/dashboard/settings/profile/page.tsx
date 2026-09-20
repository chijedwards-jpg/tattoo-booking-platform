import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileForm } from "../ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { name: true, bio: true, location: true, slug: true },
  });
  if (!artist) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Profile</h1>
      <p className="mt-1 text-sm text-grey">What clients see on your booking page.</p>
      <div className="mt-6">
        <ProfileForm artist={artist} />
      </div>
    </div>
  );
}
