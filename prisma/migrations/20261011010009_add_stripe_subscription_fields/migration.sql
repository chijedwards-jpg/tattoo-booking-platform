-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripeSubscriptionStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Artist_stripeCustomerId_key" ON "Artist"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_stripeSubscriptionId_key" ON "Artist"("stripeSubscriptionId");
