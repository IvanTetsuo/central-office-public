-- AlterTable
ALTER TABLE "Terminal" ADD COLUMN "secretHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Terminal" ALTER COLUMN "secretHash" DROP DEFAULT;
