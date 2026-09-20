"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PrimaryButton, inputClass } from "../ui";

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
    <main className="flex min-h-screen items-center justify-center bg-paper text-ink">
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-6">
        <h1 className="font-display text-3xl text-ink">Create your artist account</h1>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Your name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass()}
            />
          </Field>
          <Field label="Booking page URL — letters, numbers, dashes only">
            <div className="flex items-center rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-grey focus-within:border-ink-red">
              <span>yoursite.com/a/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                required
                className="flex-1 bg-transparent text-ink outline-none"
              />
            </div>
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass()}
            />
          </Field>
          <Field label="Password (min. 8 characters)">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass()}
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          )}

          <PrimaryButton type="submit" full disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </PrimaryButton>
        </div>

        <p className="mt-6 text-center text-sm text-grey">
          Already have an account?{" "}
          <a href="/login" className="text-ink underline">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
