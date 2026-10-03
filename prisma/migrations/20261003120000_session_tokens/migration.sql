-- Presence and signal rows are transient coordination state, and existing
-- rows have no token, so clear them before adding the required column.
DELETE FROM "Signal";
DELETE FROM "Presence";

-- AlterTable
ALTER TABLE "Presence" ADD COLUMN "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Presence_tokenHash_key" ON "Presence"("tokenHash");
