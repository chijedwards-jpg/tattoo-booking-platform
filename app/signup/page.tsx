"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink text-paper">
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-6">
        <h1 className="font-display text-3xl text-paper">Create your artist account</h1>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-xs text-paper/50">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-4 py-3 text-sm text-paper outline-none focus:border-ink-red"
            />
          </div>
          <div>
            <label className="text-xs text-paper/50">
              Booking page URL — letters, numbers, dashes only
            </label>
            <div className="mt-1 flex items-center rounded-sm border border-paper/10 bg-white/[0.02] px-4 py-3 text-sm text-paper/40 focus-within:border-ink-red">
              <span>yoursite.com/a/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                required
                className="flex-1 bg-transparent text-paper outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-paper/50">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-4 py-3 text-sm text-paper outline-none focus:border-ink-red"
            />
          </div>
          <div>
            <label className="text-xs text-paper/50">Password (min. 8 characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-4 py-3 text-sm text-paper outline-none focus:border-ink-red"
            />
          </div>

          {error && (
            <p className="rounded-sm border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-paper">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-sm bg-ink-red py-3 text-sm font-medium text-paper disabled:opacity-40"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-paper/50">
          Already have an account?{" "}
          <a href="/login" className="text-paper underline">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
