/** Browser-only — reads a File into a data: URL for sending as plain JSON. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Vercel rejects request bodies over ~4.5MB before our route ever runs, and
// the image is only part of the JSON body — leave room for the other fields.
const MAX_UPLOAD_DATA_URL_LENGTH = 3.5 * 1024 * 1024;

// Longest-edge sizes to try, largest first. Well above what the image
// analysis or the portfolio gallery needs, so most photos fit on the first.
const SHRINK_MAX_EDGES = [2400, 1800, 1400, 1000];

const TOO_LARGE_MESSAGE =
  "That photo is too large to upload. Please try a smaller version or a screenshot of it.";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Browser-only — like fileToDataUrl, but shrinks the photo into a JPEG when
 * it's too big to get through the upload limit. Anything that already fits
 * is sent untouched. Throws a client-readable error if it can't be made to fit.
 */
export async function fileToUploadDataUrl(file: File): Promise<string> {
  const original = await fileToDataUrl(file);
  if (original.length <= MAX_UPLOAD_DATA_URL_LENGTH) return original;

  // Not every browser can decode every format (HEIC outside Safari).
  const img = await loadImage(original).catch(() => {
    throw new Error(TOO_LARGE_MESSAGE);
  });

  for (const maxEdge of SHRINK_MAX_EDGES) {
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    // JPEG has no transparency — without this, transparent PNG areas turn black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const shrunk = canvas.toDataURL("image/jpeg", 0.85);
    if (shrunk.length <= MAX_UPLOAD_DATA_URL_LENGTH) return shrunk;
  }

  throw new Error(TOO_LARGE_MESSAGE);
}
