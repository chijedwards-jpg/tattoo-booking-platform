"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { fileToDataUrl } from "@/lib/files";

interface PortfolioImage {
  id: string;
  imageDataUrl: string;
  caption: string | null;
}

export function PortfolioForm({ images }: { images: PortfolioImage[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/settings/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't upload image.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/settings/portfolio/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't delete image.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
            <img src={img.imageDataUrl} alt={img.caption ?? ""} className="h-full w-full object-cover" />
            <button
              onClick={() => handleDelete(img.id)}
              disabled={deletingId === img.id}
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
          <span className="text-xs">{uploading ? "Uploading…" : "Add image"}</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />

      {images.length === 0 && (
        <p className="mt-4 text-sm text-grey">
          Add a few photos of your past work — clients see these before they submit a request.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-ink-red">{error}</p>}
    </div>
  );
}
