-- CreateEnum
CREATE TYPE "StyleMultiplierMode" AS ENUM ('TIME', 'PRICE');

-- AlterTable
ALTER TABLE "PricingConfig" ADD COLUMN     "styleMultiplierMode" "StyleMultiplierMode" NOT NULL DEFAULT 'TIME';

-- AlterTable (rename, not drop+add — preserves existing multiplier values)
ALTER TABLE "TattooStyle" RENAME COLUMN "timeMultiplier" TO "multiplier";
