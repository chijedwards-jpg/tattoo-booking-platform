"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Unlink } from "lucide-react";
import { GhostButton } from "../../ui";

export default function GoogleBusyBlockConnect({
  connected,
  configured,
  broken = false,
}: {
  connected: boolean;
  configured: boolean;
  /** Connected, but Google no longer accepts the saved login. */
  broken?: boolean;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google-calendar/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Couldn't disconnect.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!configured) {
    return (
      <p className="mt-4 text-sm text-grey">
        Not available yet — this server hasn't been set up with Google OAuth credentials.
      </p>
    );
  }

  if (connected && broken) {
    return (
      <div className="mt-4 rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3">
        <p className="text-sm font-medium text-ink">Your Google Calendar connection stopped working.</p>
        <p className="mt-1 text-sm text-ink">
          Until you reconnect, new bookings won&apos;t show up in Google Calendar, and your busy times there
          aren&apos;t being kept off your booking page, so clients could book over them.
        </p>
        <a
          href="/api/auth/google-calendar/connect"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-ink-red px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          <ShieldCheck size={14} /> Reconnect Google Calendar
        </a>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-pine">
          <ShieldCheck size={15} /> Connected
        </span>
        <GhostButton onClick={disconnect} disabled={disconnecting} className="!py-1.5 text-xs">
          <Unlink size={13} /> Disconnect
        </GhostButton>
        {error && <span className="text-xs text-ink-red">{error}</span>}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <a
        href="/api/auth/google-calendar/connect"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink-red px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        <ShieldCheck size={14} /> Connect Google Calendar
      </a>
    </div>
  );
}
