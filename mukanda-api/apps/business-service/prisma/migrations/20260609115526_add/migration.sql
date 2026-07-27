/*
  Warnings:

  - Made the column `phone` on table `Business` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "description" TEXT,
ALTER COLUMN "phone" SET NOT NULL;
