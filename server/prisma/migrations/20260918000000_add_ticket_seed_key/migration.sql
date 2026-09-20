-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "seedKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_seedKey_key" ON "Ticket"("seedKey");
