import { NextResponse } from "next/server";

/** Turns a stored data: URL into an image response. */
export function imageResponse(dataUrl: string | undefined, cacheControl: string): NextResponse {
  const match = dataUrl?.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": cacheControl },
  });
}

// A stored image never changes under its id.
export const PUBLIC_IMAGE_CACHE = "public, max-age=31536000, immutable";
export const PRIVATE_IMAGE_CACHE = "private, max-age=3600";
