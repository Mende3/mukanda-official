/*
  Warnings:

  - You are about to drop the column `marketingAgentId` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the `IaAgents` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phone]` on the table `Business` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownerId]` on the table `Business` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `agentId` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('CONVERSATION', 'MARKETING', 'ORDER_MANAGER', 'SUGGESTIONS', 'APPOINTMENT', 'LOYALTY', 'FEEDBACK_SURVEY', 'FAQ_KNOWLEDGE', 'PAYMENT_ASSISTANT', 'REENGAGEMENT', 'LEAD_QUALIFIER', 'CUSTOM');

-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE 'BUSINESS';

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_marketingAgentId_fkey";

-- DropForeignKey
ALTER TABLE "IaAgents" DROP CONSTRAINT "IaAgents_businessId_fkey";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "marketingAgentId",
ADD COLUMN     "agentId" TEXT NOT NULL;

-- DropTable
DROP TABLE "IaAgents";

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "webhook" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "personality" TEXT DEFAULT 'friendly',
    "pollTrigger" TEXT,
    "pollMinInterval" INTEGER,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_businessId_idx" ON "Agent"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_businessId_type_key" ON "Agent"("businessId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Business_phone_key" ON "Business"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Business_ownerId_key" ON "Business"("ownerId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
