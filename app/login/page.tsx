"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PrimaryButton, inputClass } from "../ui";

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
    <main className="flex min-h-screen items-center justify-center bg-paper text-ink">
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-6">
        <h1 className="font-display text-3xl text-ink">Artist login</h1>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass()}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass()}
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          )}

          <PrimaryButton type="submit" full disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </PrimaryButton>
        </div>

        <p className="mt-6 text-center text-sm text-grey">
          Don't have an account?{" "}
          <a href="/signup" className="text-ink underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
