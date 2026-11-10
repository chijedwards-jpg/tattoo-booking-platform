"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import DashboardNav from "./DashboardNav";
import LogoutButton from "./LogoutButton";

/**
 * Phone-width dashboard header: the sidebar would take two thirds of the
 * screen there, so it becomes a menu that drops down from a top bar.
 */
export default function MobileNav({ artistName, slug }: { artistName: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close after navigating, so the new page is what's visible.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="sticky top-0 z-30 bg-ink text-paper md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base leading-tight">{artistName}</p>
          <a
            href={`/a/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-[11px] text-paper/50"
          >
            /a/{slug} ↗
          </a>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="rounded-lg p-2 hover:bg-white/10"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="max-h-[calc(100vh-60px)] overflow-y-auto border-t border-white/10 px-4 pb-4 pt-2">
          <DashboardNav />
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
