/*
  Warnings:

  - The values [APPOINTMENT,FAQ_KNOWLEDGE,PAYMENT_ASSISTANT] on the enum `AgentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AgentType_new" AS ENUM ('CONVERSATION', 'ORDER_MANAGER', 'SUGGESTIONS', 'MARKETING', 'LOYALTY', 'FEEDBACK_SURVEY', 'REENGAGEMENT', 'LEAD_QUALIFIER', 'CUSTOM');
ALTER TABLE "Agent" ALTER COLUMN "type" TYPE "AgentType_new" USING ("type"::text::"AgentType_new");
ALTER TYPE "AgentType" RENAME TO "AgentType_old";
ALTER TYPE "AgentType_new" RENAME TO "AgentType";
DROP TYPE "public"."AgentType_old";
COMMIT;
