-- CreateTable
CREATE TABLE "player_collection_state" (
    "player_id" INTEGER NOT NULL,
    "reach_end" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "player_collection_state_pkey" PRIMARY KEY ("player_id")
);
