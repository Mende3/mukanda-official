-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "agentSubType" TEXT;

-- CreateIndex
CREATE INDEX "Agent_businessId_type_idx" ON "Agent"("businessId", "type");
