import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export class SlotTakenError extends Error {}

/**
 * Runs a booking for one artist with no other booking for that artist
 * running at the same time, and refuses it if the time overlaps a
 * scheduled appointment.
 *
 * Checking for a clash and then saving as two separate steps let two
 * clients who clicked the same slot at the same moment both get booked.
 * A Postgres transaction-scoped advisory lock keyed on the artist makes
 * the check and the insert happen one booking at a time; the lock is
 * released when the transaction ends.
 */
export async function bookWithArtistLock<T>(
  artistId: string,
  slot: { start: Date; end: Date },
  create: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${artistId}))`;

    const clash = await tx.appointment.findFirst({
      where: {
        artistId,
        status: "SCHEDULED",
        startTime: { lt: slot.end },
        endTime: { gt: slot.start },
      },
      select: { id: true },
    });
    if (clash) throw new SlotTakenError();

    return create(tx);
  });
}
