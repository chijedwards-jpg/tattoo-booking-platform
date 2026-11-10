"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { fileToUploadDataUrl } from "@/lib/files";
import { GhostButton, PrimaryButton } from "../../../ui";

async function request(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Something went wrong.");
  }
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function ClientNotes({
  clientId,
  notes,
}: {
  clientId: string;
  notes: { id: string; body: string; createdAt: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/api/clients/${clientId}/notes`, "POST", { body: draft });
      setDraft("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this note?")) return;
    setDeletingId(id);
    setError(null);
    try {
      await request(`/api/clients/${clientId}/notes/${id}`, "DELETE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <form onSubmit={add}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Add a note, e.g. allergic to latex, prefers morning sessions, wants to add a rose next time"
          className="w-full rounded-xl border border-line bg-card p-3 text-sm text-ink"
        />
        <PrimaryButton type="submit" className="mt-2" disabled={busy || !draft.trim()}>
          {busy ? "Saving…" : "Add note"}
        </PrimaryButton>
      </form>
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}

      {notes.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex items-start gap-3">
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-ink">{n.body}</p>
                <button
                  onClick={() => remove(n.id)}
                  disabled={deletingId === n.id}
                  aria-label="Delete note"
                  className="text-grey hover:text-ink-red disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-2 text-xs text-grey">{n.createdAt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export function ClientPhotos({
  clientId,
  photos,
}: {
  clientId: string;
  photos: { id: string; caption: string | null }[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const imageDataUrl = await fileToUploadDataUrl(file);
      await request(`/api/clients/${clientId}/photos`, "POST", { imageDataUrl });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this photo?")) return;
    setDeletingId(id);
    setError(null);
    try {
      await request(`/api/clients/${clientId}/photos/${id}`, "DELETE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
            <a href={`/api/clients/${clientId}/photos/${p.id}`} target="_blank" rel="noopener noreferrer">
              <img src={`/api/clients/${clientId}/photos/${p.id}`} alt={p.caption ?? ""} className="h-full w-full object-cover" />
            </a>
            <button
              onClick={() => remove(p.id)}
              disabled={deletingId === p.id}
              aria-label="Delete photo"
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-paper transition-colors hover:bg-ink-red disabled:cursor-not-allowed"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-grey transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={18} />
          <span className="text-xs">{uploading ? "Uploading…" : "Add photo"}</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={upload}
        className="hidden"
      />
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Private rating of the client
// ---------------------------------------------------------------------------

export function PrivateRating({
  clientId,
  initialRating,
  initialComment,
}: {
  clientId: string;
  initialRating: number;
  initialComment: string;
}) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await request(`/api/clients/${clientId}/rating`, "PUT", { rating, comment });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex gap-0.5" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => {
              setRating(n);
              setSaved(false);
            }}
            className="p-0.5"
          >
            <Star size={22} className={n <= rating ? "fill-ochre text-ochre" : "text-line"} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setSaved(false);
        }}
        rows={2}
        maxLength={1000}
        placeholder="e.g. On time, sat well, tipped"
        className="mt-2 w-full rounded-xl border border-line bg-paper p-2.5 text-sm text-ink"
      />
      <div className="mt-2 flex items-center gap-3">
        <GhostButton onClick={save} disabled={busy || rating === 0}>
          {busy ? "Saving…" : "Save rating"}
        </GhostButton>
        {saved && <span className="text-xs text-pine">Saved</span>}
      </div>
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Show a client's review on the public booking page
// ---------------------------------------------------------------------------

export function ReviewVisibility({ reviewId, initialShown }: { reviewId: string; initialShown: boolean }) {
  const [shown, setShown] = useState(initialShown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !shown;
    setBusy(true);
    setError(null);
    try {
      await request(`/api/reviews/${reviewId}`, "PATCH", { showOnPage: next });
      setShown(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
        <input type="checkbox" checked={shown} onChange={toggle} disabled={busy} />
        Show on my booking page
      </label>
      {error && <p className="mt-1 text-xs text-ink-red">{error}</p>}
    </div>
  );
}
