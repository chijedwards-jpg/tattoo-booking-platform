"use client";

import { useState } from "react";
import { Field, PrimaryButton, inputClass } from "../ui";

export default function SignupPage() {
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

      // Account exists now, but isn't usable until a subscription (even a
      // trialing one) is attached — send them straight into Stripe Checkout
      // rather than dropping them on a dashboard they can't access yet.
      const checkoutRes = await fetch("/api/billing/checkout", { method: "POST" });
      const checkoutBody = await checkoutRes.json().catch(() => ({}));
      if (!checkoutRes.ok || !checkoutBody.url) {
        throw new Error(checkoutBody.error ?? "Could not start checkout.");
      }
      window.location.href = checkoutBody.url;
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

        <p className="mt-6 text-center text-xs text-grey">
          By creating an account, you agree to our{" "}
          <a href="/terms" className="underline hover:text-ink">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-ink">
            Privacy Policy
          </a>
          .
        </p>

        <p className="mt-4 text-center text-sm text-grey">
          Already have an account?{" "}
          <a href="/login" className="text-ink underline">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
