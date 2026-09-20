import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const UpdateSchema = z.object({
  action: z.enum(["MARK_DEPOSIT_RECEIVED", "CANCEL"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: params.id } });
  if (!appointment || appointment.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.action === "MARK_DEPOSIT_RECEIVED") {
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { depositPaid: true },
    });
    return NextResponse.json({ appointment: updated });
  }

  // CANCEL — free the slot and let the client come back through their
  // booking link to pick a new one.
  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  if (appointment.submissionId) {
    await prisma.submission.update({
      where: { id: appointment.submissionId },
      data: {
        status: appointment.type === "CONSULTATION" ? "RED_CONSULTATION_REQUIRED" : "APPROVED",
      },
    });
  }

  return NextResponse.json({ appointment: updated });
}
