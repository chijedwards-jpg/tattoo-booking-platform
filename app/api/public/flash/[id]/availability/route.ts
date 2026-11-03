import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isFlashBookable } from "@/lib/flash";
import { findOpenSlots } from "@/lib/slots";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const design = await prisma.flashDesign.findUnique({
    where: { id: params.id },
    select: {
      active: true,
      oneOff: true,
      claimedAt: true,
      durationMins: true,
      artist: { select: { id: true, timeZone: true, availability: true } },
    },
  });
  if (!design || !isFlashBookable(design)) {
    return NextResponse.json({ error: "This design isn't available" }, { status: 404 });
  }

  const { slots, timeZone } = await findOpenSlots({
    artistId: design.artist.id,
    timeZone: design.artist.timeZone,
    availability: design.artist.availability,
    type: "TATTOO",
    durationMins: design.durationMins,
  });

  return NextResponse.json({
    timeZone,
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
  });
}
