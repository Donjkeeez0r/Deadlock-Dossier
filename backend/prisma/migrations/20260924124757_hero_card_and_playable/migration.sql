-- AlterTable
ALTER TABLE "Hero" ADD COLUMN     "cardUrl" TEXT,
ADD COLUMN     "isPlayable" BOOLEAN NOT NULL DEFAULT true;
