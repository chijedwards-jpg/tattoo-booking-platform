import { redirect } from "next/navigation";

// Settings used to be one long page — now split into separate tabs
// (pricing, styles, rules, availability, profile). Keep the bare URL
// working for anyone with an old link.
export default function SettingsPage() {
  redirect("/dashboard/settings/pricing");
}
