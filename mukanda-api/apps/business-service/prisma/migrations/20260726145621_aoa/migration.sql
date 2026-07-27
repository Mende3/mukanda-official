-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "currency" SET DEFAULT 'aoa';

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_scheduledPlanId_fkey" FOREIGN KEY ("scheduledPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
