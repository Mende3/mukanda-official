/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `CampaignRule` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CampaignRule" DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "imageUrl";
