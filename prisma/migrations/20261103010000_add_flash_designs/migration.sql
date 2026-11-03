-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "flashDesignId" TEXT;

-- CreateTable
CREATE TABLE "FlashDesign" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageDataUrl" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "durationMins" INTEGER NOT NULL,
    "oneOff" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashDesign_artistId_idx" ON "FlashDesign"("artistId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_flashDesignId_fkey" FOREIGN KEY ("flashDesignId") REFERENCES "FlashDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashDesign" ADD CONSTRAINT "FlashDesign_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
