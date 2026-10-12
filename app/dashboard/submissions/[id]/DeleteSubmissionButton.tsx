"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { GhostButton } from "../../../ui";

export default function DeleteSubmissionButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't delete this submission.");
      }
      router.push("/dashboard/submissions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3">
        <p className="flex-1 text-sm text-ink">Delete this submission? This can't be undone.</p>
        <GhostButton onClick={() => setConfirming(false)} className="!py-1.5 text-xs">
          Cancel
        </GhostButton>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full bg-ink-red px-4 py-1.5 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <GhostButton
        onClick={() => setConfirming(true)}
        className="!border-ink-red/40 !py-1.5 text-xs !text-ink-red hover:!bg-ink-red/5"
      >
        <Trash2 size={13} /> Delete submission
      </GhostButton>
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}
    </div>
  );
}
