/*
  Warnings:

  - A unique constraint covering the columns `[whatsappInstanceKey]` on the table `Business` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `whatsappInstanceKey` to the `Business` table without a default value. This is not possible if the table is not empty.
  - Made the column `whatsappInstanceId` on table `Business` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "whatsappInstanceKey" TEXT NOT NULL,
ALTER COLUMN "whatsappInstanceId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Business_whatsappInstanceKey_key" ON "Business"("whatsappInstanceKey");
