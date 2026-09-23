/*
  Warnings:

  - You are about to drop the column `credentialsVersion` on the `Shop` table. All the data in the column will be lost.
  - Made the column `comment` on table `TerminalRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "credentialsVersion";

-- AlterTable
ALTER TABLE "TerminalRequest" ALTER COLUMN "comment" SET NOT NULL;

-- CreateTable
CREATE TABLE "ShopSession" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ShopSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSession_shopId_key" ON "ShopSession"("shopId");

-- CreateIndex
CREATE INDEX "ShopSession_expiresAt_idx" ON "ShopSession"("expiresAt");

-- CreateIndex
CREATE INDEX "ShopSession_revokedAt_idx" ON "ShopSession"("revokedAt");

-- AddForeignKey
ALTER TABLE "ShopSession" ADD CONSTRAINT "ShopSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
