/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `ShopOwner` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `ShopOwner` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ShopOwner" ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ShopOwner_email_key" ON "ShopOwner"("email");
