"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
        <h1 className="font-display text-3xl text-paper">Artist login</h1>

        <div className="mt-6 flex flex-col gap-4">
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
            <label className="text-xs text-paper/50">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-paper/50">
          Don't have an account?{" "}
          <a href="/signup" className="text-paper underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
