-- AlterTable
ALTER TABLE "players" ADD COLUMN     "artifacts_data" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE INDEX "players_artifacts_data_gin_idx" ON "players" USING GIN ("artifacts_data");
