import { prisma } from "./db";

/**
 * A client belongs to an artist once they've sent that artist a request or
 * booked with them. Client rows are shared between artists, so every
 * client-record route checks this before reading or writing anything.
 */
export async function artistHasClient(artistId: string, clientId: string): Promise<boolean> {
  const link = await prisma.client.findFirst({
    where: {
      id: clientId,
      OR: [{ submissions: { some: { artistId } } }, { appointments: { some: { artistId } } }],
    },
    select: { id: true },
  });
  return link != null;
}
