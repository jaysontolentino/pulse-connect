-- AlterTable
ALTER TABLE "Presence" ADD COLUMN     "requestCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requestWindowAt" TIMESTAMP(3),
ADD COLUMN     "signalCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "signalWindowAt" TIMESTAMP(3);

