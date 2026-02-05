/*
  Warnings:

  - Changed the type of `table_id` on the `players` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "players" DROP CONSTRAINT "players_table_id_fkey";

-- AlterTable
ALTER TABLE "players" DROP COLUMN "table_id",
ADD COLUMN     "table_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "players_table_id_idx" ON "players"("table_id");

-- CreateIndex
CREATE INDEX "players_table_id_race_id_idx" ON "players"("table_id", "race_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "games"("table_id") ON DELETE CASCADE ON UPDATE CASCADE;
