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

export interface TableInfoPlayerResult {
  player_id: string;
  score: string;
  score_aux: string;
  gamerank: string; // "1" = winner, "2" = second place, etc.
  is_tie: string;
  point_win: string; // ELO change (can be negative)
  rank_after_game: string; // Player's ELO after this game
  finish_game: string;
  arena_points_win: string | null;
  arena_after_game: string | null;
  name: string;
  avatar: string;
  gender: string | null;
  country: {
    name: string;
    cur: string;
    code: string;
    flag_x: number;
    flag_y: number;
  };
  is_premium: string;
  is_beginner: string;
  th_name: string | null;
}

export interface GetTableInfoResponse {
  status: number;
  data: {
    id: string; // Table ID
    game_id: string;
    game_name: string;
    status: string; // "archive" for finished games
    result: {
      id: string;
      time_start: string;
      time_end: string;
      time_duration: string;
      table_level: string;
      game_id: string;
      concede: string;
      endgame_reason: string;
      game_name: string;
      player: TableInfoPlayerResult[]; // Array of players with ELO data
      penalties: Record<string, { leave: number; clock: number }>;
      is_solo: boolean;
      stats: any; // Game statistics (masked for privacy)
      trophies: any[];
    };
    [key: string]: any; // Other fields
  };
}

export interface RankingPlayer {
  id: string; // Player ID
  name: string; // Player display name
  country: {
    name: string;
    cur: string;
    code: string;
    flag_x: number;
    flag_y: number;
  };
  ranking: string; // ELO rating
  nbr_game: string; // Number of games played
  rank_no: string; // Rank position (1 = first place)
  avatar: string;
  device: string; // "desktop" or "mobile"
  status: string; // "online" or "offline"
}

export interface GetRankingResponse {
  status: number;
  data: {
    ranks: RankingPlayer[]; // Array of ranked players
  };
}

export interface SearchPlayerResult {
  id: number; // Player ID
  avatar: string;
  fullname: string; // Player display name
  country_infos: {
    name: string;
    cur: string;
    code: string;
    flag_x: number;
    flag_y: number;
  };
  outbound_friend_request: string | null;
  inbound_friend_request: string | null;
}

export interface SearchPlayerResponse {
  status: number;
  data: {
    groups: any[];
    players: SearchPlayerResult[];
  };
}
