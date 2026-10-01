-- CreateTable
CREATE TABLE "game_replays" (
    "table_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "map_timeline" JSONB NOT NULL,

    CONSTRAINT "game_replays_pkey" PRIMARY KEY ("table_id")
);

-- AddForeignKey
ALTER TABLE "game_replays" ADD CONSTRAINT "game_replays_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "games"("table_id") ON DELETE CASCADE ON UPDATE CASCADE;
