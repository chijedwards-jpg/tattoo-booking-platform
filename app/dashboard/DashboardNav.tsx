"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Calendar, DollarSign, Palette, ShieldAlert, CalendarClock, Settings as SettingsIcon,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", Icon: Home },
  { href: "/dashboard/submissions", label: "Submissions", Icon: Users },
  { href: "/dashboard/calendar", label: "Calendar", Icon: Calendar },
  { href: "/dashboard/settings/pricing", label: "Pricing", Icon: DollarSign },
  { href: "/dashboard/settings/styles", label: "Styles & Time", Icon: Palette },
  { href: "/dashboard/settings/rules", label: "Booking Rules", Icon: ShieldAlert },
  { href: "/dashboard/settings/availability", label: "Availability", Icon: CalendarClock },
  { href: "/dashboard/settings/profile", label: "Profile", Icon: SettingsIcon },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1">
      {NAV.map(({ href, label, Icon }) => {
        const active = href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active ? "bg-ink-red text-paper" : "text-paper/70 hover:bg-white/5 hover:text-paper"
            }`}
          >
            <Icon size={15} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
