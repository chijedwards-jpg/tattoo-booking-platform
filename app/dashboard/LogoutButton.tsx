"use client";

import { useRouter } from "next/navigation";

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
      className="rounded-sm border border-paper/15 px-4 py-2 text-xs text-paper/60 hover:text-paper"
    >
      Log out
    </button>
  );
}
