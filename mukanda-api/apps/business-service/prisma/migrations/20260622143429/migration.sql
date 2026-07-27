/*
  Warnings:

  - You are about to drop the column `InstanceActive` on the `Business` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Business" DROP COLUMN "InstanceActive",
ADD COLUMN     "instanceActive" BOOLEAN NOT NULL DEFAULT false;
