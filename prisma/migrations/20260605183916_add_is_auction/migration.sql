-- AlterTable
ALTER TABLE "games" ADD COLUMN     "is_auction" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "games_is_auction_idx" ON "games"("is_auction");
