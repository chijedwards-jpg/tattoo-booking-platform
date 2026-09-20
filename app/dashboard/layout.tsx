import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardNav from "./DashboardNav";
import LogoutButton from "./LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) redirect("/login");

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
