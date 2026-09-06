-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('FLAT', 'PERCENT');

-- CreateEnum
CREATE TYPE "RestrictionType" AS ENUM ('PLACEMENT', 'STYLE', 'SUBJECT_MATTER', 'OTHER');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('TATTOO', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_ANALYSIS', 'GREEN_AUTO_BOOKABLE', 'YELLOW_ARTIST_REVIEW', 'RED_CONSULTATION_REQUIRED', 'APPROVED', 'DECLINED', 'BOOKED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('TATTOO', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "profilePhoto" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "minimumPrice" DOUBLE PRECISION NOT NULL,
    "rangeSpreadPct" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "depositType" "DepositType" NOT NULL DEFAULT 'FLAT',
    "depositFlat" DOUBLE PRECISION,
    "depositPercent" DOUBLE PRECISION,
    "cancellationPolicy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TattooStyle" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeMultiplier" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TattooStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistRestriction" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "type" "RestrictionType" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ArtistRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRules" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "maxAutoBookDurationMins" INTEGER NOT NULL DEFAULT 180,
    "maxAutoBookComplexity" INTEGER NOT NULL DEFAULT 6,
    "minAiConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "referenceFreedomMaxForAutoBook" INTEGER NOT NULL DEFAULT 40,
    "requireConsultAboveDurationMins" INTEGER NOT NULL DEFAULT 240,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityBlock" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "type" "AvailabilityType" NOT NULL,
    "dayOfWeek" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspirationImages" TEXT[],
    "placementPhoto" TEXT,
    "description" TEXT,
    "placement" TEXT NOT NULL,
    "sizeInches" DOUBLE PRECISION,
    "sizePreset" TEXT,
    "referenceFreedom" INTEGER NOT NULL,
    "aiDetectedStyle" TEXT,
    "aiComplexity" INTEGER,
    "aiEstimatedHours" DOUBLE PRECISION,
    "aiConfidence" DOUBLE PRECISION,
    "aiColorVsBW" TEXT,
    "aiRawAnalysis" JSONB,
    "estimatedPriceLow" DOUBLE PRECISION,
    "estimatedPriceHigh" DOUBLE PRECISION,
    "estimatedHours" DOUBLE PRECISION,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_ANALYSIS',
    "artistOverridePriceLow" DOUBLE PRECISION,
    "artistOverridePriceHigh" DOUBLE PRECISION,
    "artistOverrideHours" DOUBLE PRECISION,
    "artistNotes" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "submissionId" TEXT,
    "type" "AppointmentType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DOUBLE PRECISION,
    "stripePaymentIntentId" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_email_key" ON "Artist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfig_artistId_key" ON "PricingConfig"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "TattooStyle_artistId_name_key" ON "TattooStyle"("artistId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRules_artistId_key" ON "BookingRules"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_submissionId_key" ON "Appointment"("submissionId");

-- AddForeignKey
ALTER TABLE "PricingConfig" ADD CONSTRAINT "PricingConfig_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TattooStyle" ADD CONSTRAINT "TattooStyle_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistRestriction" ADD CONSTRAINT "ArtistRestriction_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRules" ADD CONSTRAINT "BookingRules_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
