/*
  Warnings:

  - The values [ENTERPRISE] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('FREE', 'BASIC', 'PRO', 'BUSINESS');
ALTER TABLE "public"."Business" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Business" ALTER COLUMN "plan" TYPE "PlanType_new" USING ("plan"::text::"PlanType_new");
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "public"."PlanType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Business" ALTER COLUMN "plan" DROP DEFAULT;
