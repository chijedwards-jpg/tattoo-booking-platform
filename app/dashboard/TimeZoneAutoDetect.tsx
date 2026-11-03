"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fills in the zone for accounts created before artists had one. Rendered by
 * the dashboard layout only while it's still unset.
 */
export function TimeZoneAutoDetect() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/settings/time-zone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    })
      .then((res) => {
        if (res.ok) router.refresh();
      })
      .catch(() => {});
  }, [router]);

  return null;
}
