-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "quotaPeriod" "QuotaPeriod" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "rateBurstTokens" INTEGER,
ADD COLUMN     "rateRefillPerSec" DOUBLE PRECISION,
ALTER COLUMN "agentSlots" SET DEFAULT 2;

-- CreateTable
CREATE TABLE "AiUsageQuota" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsageQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiUsageQuota_businessId_key" ON "AiUsageQuota"("businessId");

-- CreateIndex
CREATE INDEX "AiUsageQuota_businessId_idx" ON "AiUsageQuota"("businessId");

-- CreateIndex
CREATE INDEX "AiUsageEvent_businessId_createdAt_idx" ON "AiUsageEvent"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiUsageQuota" ADD CONSTRAINT "AiUsageQuota_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
