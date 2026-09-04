-- AlterEnum
ALTER TYPE "AiInteractionKind" ADD VALUE 'CHECKIN';

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkDate" DATE NOT NULL,
    "moodScore" INTEGER NOT NULL,
    "energy" INTEGER,
    "factors" JSONB NOT NULL DEFAULT '[]',
    "goalStatuses" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckIn_userId_checkDate_idx" ON "CheckIn"("userId", "checkDate");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_userId_checkDate_key" ON "CheckIn"("userId", "checkDate");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

