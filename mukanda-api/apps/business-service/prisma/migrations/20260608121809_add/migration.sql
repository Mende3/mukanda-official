/*
  Warnings:

  - You are about to drop the `CampaignRecipient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConversationAgent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MarketingAgent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SugestAgent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_marketingAgentId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignRecipient" DROP CONSTRAINT "CampaignRecipient_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationAgent" DROP CONSTRAINT "ConversationAgent_businessId_fkey";

-- DropForeignKey
ALTER TABLE "MarketingAgent" DROP CONSTRAINT "MarketingAgent_businessId_fkey";

-- DropForeignKey
ALTER TABLE "SugestAgent" DROP CONSTRAINT "SugestAgent_businessId_fkey";

-- DropTable
DROP TABLE "CampaignRecipient";

-- DropTable
DROP TABLE "ConversationAgent";

-- DropTable
DROP TABLE "MarketingAgent";

-- DropTable
DROP TABLE "SugestAgent";

-- CreateTable
CREATE TABLE "IaAgents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "webhook" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "personality" TEXT DEFAULT 'friendly',
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IaAgents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IaAgents_businessId_key" ON "IaAgents"("businessId");

-- AddForeignKey
ALTER TABLE "IaAgents" ADD CONSTRAINT "IaAgents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_marketingAgentId_fkey" FOREIGN KEY ("marketingAgentId") REFERENCES "IaAgents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
