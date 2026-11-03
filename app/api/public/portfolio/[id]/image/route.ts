import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { imageResponse, PUBLIC_IMAGE_CACHE } from "@/lib/imageResponse";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const image = await prisma.portfolioImage.findUnique({
    where: { id: params.id },
    select: { imageDataUrl: true },
  });
  return imageResponse(image?.imageDataUrl, PUBLIC_IMAGE_CACHE);
}
