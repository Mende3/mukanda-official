/*
  Warnings:

  - You are about to drop the column `whatsappInstanceKey` on the `Business` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[whatsappInstanceToken]` on the table `Business` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `whatsappInstanceToken` to the `Business` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Business_whatsappInstanceKey_key";

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "whatsappInstanceKey",
ADD COLUMN     "whatsappInstanceToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Business_whatsappInstanceToken_key" ON "Business"("whatsappInstanceToken");
