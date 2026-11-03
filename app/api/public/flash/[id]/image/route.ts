import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { imageResponse, PUBLIC_IMAGE_CACHE } from "@/lib/imageResponse";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const design = await prisma.flashDesign.findUnique({
    where: { id: params.id },
    select: { imageDataUrl: true },
  });
  return imageResponse(design?.imageDataUrl, PUBLIC_IMAGE_CACHE);
}
