-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "template" TEXT;

-- CreateTable
CREATE TABLE "WeeklyRecap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "stats" JSONB NOT NULL,
    "aiLine" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyRecap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRecap_userId_weekStart_key" ON "WeeklyRecap"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyRecap" ADD CONSTRAINT "WeeklyRecap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

