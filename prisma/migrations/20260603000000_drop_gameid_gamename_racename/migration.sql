-- AlterTable
ALTER TABLE "games" DROP COLUMN "game_id",
                   DROP COLUMN "game_name";

-- AlterTable
ALTER TABLE "players" DROP COLUMN "race_name";

-- DropIndex
DROP INDEX IF EXISTS "players_race_name_idx";
