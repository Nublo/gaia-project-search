// Game-related TypeScript types

export interface GameResult {
  id: string;
  tableId: number;
  playerCount: number;
  winnerName: string;
  minPlayerElo?: number | null;
  finalScorings: number[];
  isComplete: boolean;
  isAuction: boolean;
  players: PlayerResult[];
}

export interface PlayerResult {
  id: string;
  playerId: number;
  playerName: string;
  raceId: number;
  raceName: string;
  finalScore: number;
  playerElo?: number | null;
  isWinner: boolean;
  buildingsData: { buildings: number[][] };
  researchData: { research: number[][] };
  advancedTechsData: number[];
  standardTechsData: number[];
  qicPoints: number;
  techPoints: number;
  totalScoredPoints: number;
  factionCost: number;
}

export interface AdvancedTechCondition {
  race?: string;
  techId: number;
}

export interface StandardTechCondition {
  race?: string;
  techId: number;
}

export interface PlayerRaceCondition {
  playerNames: string[];
  race: string;
}

export interface SearchRequest {
  winnerRace?: string;
  winnerPlayerName?: string;
  minPlayerElo?: number;
  isAuction?: boolean;
  playerNames: string[][];
  playerCounts: number[];
  structureConditions: StructureCondition[];
  researchConditions: ResearchCondition[];
  finalScorings?: number[];
  advancedTechConditions?: AdvancedTechCondition[];
  standardTechConditions?: StandardTechCondition[];
  playerRaceConditions?: PlayerRaceCondition[];
  sortBy?: 'qicPoints' | 'techPoints' | 'totalScoredPoints' | 'finalScore' | 'factionCost';
}

export interface StructureCondition {
  race?: string;
  structure?: string;
  maxRound?: number;
}

export interface ResearchCondition {
  race?: string;      // optional — filter to specific race
  track?: number;     // ResearchTrack ID (1-6)
  minLevel?: number;  // minimum absolute level (0-5)
  maxRound?: number;  // check level at end of this round; absent = end of game (round 6)
}

export interface SearchResponse {
  games: GameResult[];
  total: number;
}
