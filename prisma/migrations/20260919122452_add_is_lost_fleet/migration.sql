-- AlterTable
ALTER TABLE "games" ADD COLUMN     "is_lost_fleet" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "games_is_lost_fleet_idx" ON "games"("is_lost_fleet");
