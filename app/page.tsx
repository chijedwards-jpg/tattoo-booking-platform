import { redirect } from "next/navigation";

// No general landing/directory page yet — each artist's real intake page
// lives at /a/[slug]. This just keeps the bare root URL useful for local
// testing against the seeded demo artist.
export default function RootPage() {
  redirect("/a/demo-artist");
}
