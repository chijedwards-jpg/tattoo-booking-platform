import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasActiveSubscriptionAccess } from "@/lib/stripe";
import { SubscribeButton } from "./SubscribeButton";
import DashboardNav from "./DashboardNav";
import LogoutButton from "./LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) redirect("/login");

  // No active or trialing subscription — don't render any dashboard content
  // (including children, which assume a usable account), just the paywall.
  if (!hasActiveSubscriptionAccess(artist.stripeSubscriptionStatus)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl text-ink">Subscribe to continue</h1>
          <p className="mt-2 text-sm text-grey">
            {artist.stripeSubscriptionStatus === "canceled"
              ? "Your subscription was canceled. Resubscribe to get back into your dashboard."
              : "Start your 14-day free trial to set up your booking page and dashboard."}
          </p>
          <div className="mt-6 flex justify-center">
            <SubscribeButton label="Start free trial — $29/mo after" />
          </div>
          <div className="mt-4 flex justify-center">
            <LogoutButton className="text-sm text-grey underline hover:text-ink" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-56 shrink-0 flex-col bg-ink px-4 py-6 text-paper">
        <div className="mb-8 px-2">
          <p className="font-display text-lg leading-tight">{artist.name}</p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-paper/50">
            Artist dashboard
          </p>
          <a
            href={`/a/${artist.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-xs text-paper/40 hover:text-paper/70"
          >
            /a/{artist.slug} ↗
          </a>
        </div>

        <DashboardNav />

        <LogoutButton />
      </aside>

      <main className="flex-1 overflow-auto p-8 text-ink">{children}</main>
    </div>
  );
}
