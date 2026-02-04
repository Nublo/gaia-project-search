-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "game_id" INTEGER NOT NULL,
    "game_log" JSONB NOT NULL,
    "player_name" TEXT,
    "player_race" TEXT,
    "final_score" INTEGER,
    "player_elo" INTEGER,
    "game_date" TIMESTAMP(3),
    "round_count" INTEGER,
    "player_count" INTEGER,
    "buildings_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_game_id_key" ON "games"("game_id");

-- CreateIndex
CREATE INDEX "games_player_race_idx" ON "games"("player_race");

-- CreateIndex
CREATE INDEX "games_player_name_idx" ON "games"("player_name");

-- CreateIndex
CREATE INDEX "games_final_score_idx" ON "games"("final_score");

-- CreateIndex
CREATE INDEX "games_player_elo_idx" ON "games"("player_elo");

-- CreateIndex
CREATE INDEX "games_game_date_idx" ON "games"("game_date");
