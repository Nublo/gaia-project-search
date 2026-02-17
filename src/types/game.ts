// Game-related TypeScript types

export interface GameResult {
  id: string;
  tableId: number;
  playerCount: number;
  winnerName: string;
  minPlayerElo?: number | null;
  players: PlayerResult[];
}

export interface PlayerResult {
  id: string;
  playerName: string;
  raceId: number;
  raceName: string;
  finalScore: number;
  playerElo?: number | null;
  isWinner: boolean;
}

export interface SearchRequest {
  winnerRace?: string;
  winnerPlayerName?: string;
  minPlayerElo?: number;
  playerNames: string[];
  playerCounts: number[];
  structureConditions: StructureCondition[];
}

export interface StructureCondition {
  race?: string;
  structure?: string;
  maxRound?: number;
}

export interface SearchResponse {
  games: GameResult[];
  total: number;
}
