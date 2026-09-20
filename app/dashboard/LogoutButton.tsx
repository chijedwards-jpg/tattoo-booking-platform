"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2.5 rounded-lg border border-paper/15 px-3 py-2.5 text-sm text-paper/60 transition-colors hover:bg-white/5 hover:text-paper"
    >
      <LogOut size={15} /> Log out
    </button>
  );
}
