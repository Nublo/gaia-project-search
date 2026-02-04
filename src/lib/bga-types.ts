// BGA API Types

export interface BGAConfig {
  webrtcEnabled: boolean;
  facebookAppId: string;
  googleAppId: string;
  requestToken: string;
  locale: string;
  [key: string]: any;
}

export interface LoginResponse {
  status: number;
  data: {
    success: boolean;
    username: string;
    user_id: string;
    avatar: string;
    is_premium: string;
    partner_event?: {
      title: string;
      news_url: string;
      img_url: string;
    };
  };
}

export interface BGASession {
  requestToken: string;
  cookies: Map<string, string>;
  userId?: string;
  username?: string;
}

export interface GetPlayerFinishedGamesResponse {
  status: number;
  data: {
    tables: GameTableInfo[];
    stats?: {
      general: {
        played: string; // Total number of games played
        score: string; // Average score
        victory: string; // Number of victories
        elo_win: string; // Total ELO gained/lost
      };
      games: Array<{
        table_game: string;
        game_name: string;
        game_id: string;
        cnt: string; // Count of games
      }>;
      opponents: Array<{
        id: string;
        name: string;
        nbr: string; // Number of games with this opponent
        hits: string; // Number of wins against this opponent
      }>;
    };
  };
}

export interface GameTableInfo {
  table_id: string; // Unique game table identifier
  game_id: string; // Game type ID (e.g., "1495" for Gaia Project)
  game_name: string; // Game name (e.g., "gaiaproject")
  ranking_disabled: string; // "0" or "1"
  start: string; // Unix timestamp
  end: string; // Unix timestamp
  concede: string; // "0" = normal end, "1" = someone conceded
  unranked: string; // "0" or "1"
  normalend: string; // "0" or "1"
  players: string; // Comma-separated player IDs
  player_names: string; // Comma-separated player names
  scores: string; // Comma-separated scores
  ranks: string; // Comma-separated ranks
  elo_win: string; // ELO change for the player
  elo_penalty: string; // ELO penalty (if any)
  elo_after: string; // Player's ELO after this game
  arena_win: string | null; // Arena points won
  arena_after: string | null; // Arena points after game
}

export interface GetGameLogResponse {
  status: number;
  data: {
    logs: any[]; // Array of log entries (structure TBD)
    [key: string]: any; // Other fields we'll discover
  };
}
