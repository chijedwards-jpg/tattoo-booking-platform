"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Artist } from "@prisma/client";
import { Card, Field, PrimaryButton, inputClass } from "../../ui";

export function ProfileForm({ artist }: { artist: Pick<Artist, "name" | "bio" | "location" | "slug"> }) {
  const router = useRouter();
  const [name, setName] = useState(artist.name);
  const [bio, setBio] = useState(artist.bio ?? "");
  const [location, setLocation] = useState(artist.location ?? "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio: bio || null, location: location || null }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save profile.");
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass()} />
        </Field>

        <div className="mt-4">
          <Field label="Bio" hint="Shown to clients at the start of your booking page.">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className={inputClass()}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Location (optional)">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Salt Lake City, UT"
              className={inputClass()}
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </PrimaryButton>
          {saved && <span className="text-xs text-grey">Saved</span>}
          {error && <span className="text-xs text-ink-red">{error}</span>}
        </div>
      </Card>
    </form>
  );
}
