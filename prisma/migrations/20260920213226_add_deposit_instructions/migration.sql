-- AlterTable
ALTER TABLE "PricingConfig" ADD COLUMN     "depositInstructions" TEXT;

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "stripePaymentIntentId";
