-- AlterTable
ALTER TABLE "IaAgents" ADD COLUMN     "pollMinInterval" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pollTrigger" TEXT NOT NULL DEFAULT 'both';
