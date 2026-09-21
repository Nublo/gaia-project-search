-- AlterTable
ALTER TABLE "games" ADD COLUMN     "artifacts" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE INDEX "games_artifacts_gin_idx" ON "games" USING GIN ("artifacts");
