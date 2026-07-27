-- AlterTable
ALTER TABLE "IaAgents" ALTER COLUMN "pollMinInterval" DROP NOT NULL,
ALTER COLUMN "pollTrigger" DROP NOT NULL;
