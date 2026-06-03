/**
 * Gaia Project game constants
 *
 * This file contains mappings for races, buildings, actions, and other
 * game elements as they appear in BGA game logs.
 */

// ============================================================================
// RACES
// ============================================================================

export enum RaceId {
  TERRANS = 1,
  LANTIDS = 2,
  XENOS = 3,
  GLEENS = 4,
  TAKLONS = 5,
  AMBAS = 6,
  HADSCH_HALLAS = 7,
  IVITS = 8,
  GEODENS = 9,
  BAL_TAKS = 10,
  FIRACS = 11,
  BESCODS = 12,
  NEVLAS = 13,
  ITARS = 14,
}

export const RACE_NAMES: Record<RaceId, string> = {
  [RaceId.TERRANS]: 'Terrans',
  [RaceId.LANTIDS]: 'Lantids',
  [RaceId.XENOS]: 'Xenos',
  [RaceId.GLEENS]: 'Gleens',
  [RaceId.TAKLONS]: 'Taklons',
  [RaceId.AMBAS]: 'Ambas',
  [RaceId.HADSCH_HALLAS]: 'Hadsch Hallas',
  [RaceId.IVITS]: 'Ivits',
  [RaceId.GEODENS]: 'Geodens',
  [RaceId.BAL_TAKS]: 'Bal T\'aks',
  [RaceId.FIRACS]: 'Firacs',
  [RaceId.BESCODS]: 'Bescods',
  [RaceId.NEVLAS]: 'Nevlas',
  [RaceId.ITARS]: 'Itars',
};

// Helper function to get race name
export function getRaceName(raceId: number): string {
  return RACE_NAMES[raceId as RaceId] || `Unknown Race (${raceId})`;
}

// ============================================================================
// BUILDINGS
// ============================================================================

export enum BuildingType {
  MINE = 4,
  TRADING_STATION = 5,
  RESEARCH_LAB = 6,
  ACADEMY_LEFT = 7,
  ACADEMY_RIGHT = 8,
  PLANETARY_INSTITUTE = 9,
  // Note: Gaia formers and space stations might have different IDs
}

export const BUILDING_NAMES: Record<BuildingType, string> = {
  [BuildingType.MINE]: 'Mine',
  [BuildingType.TRADING_STATION]: 'Trading Station',
  [BuildingType.RESEARCH_LAB]: 'Research Lab',
  [BuildingType.PLANETARY_INSTITUTE]: 'Planetary Institute',
  [BuildingType.ACADEMY_LEFT]: 'Academy (Knowledge)',
  [BuildingType.ACADEMY_RIGHT]: 'Academy (QIC)',
};

// Helper function to get building name
export function getBuildingName(buildingId: number): string {
  return BUILDING_NAMES[buildingId as BuildingType] || `Unknown Building (${buildingId})`;
}

// ============================================================================
// RESEARCH TRACKS
// ============================================================================

export enum ResearchTrack {
  TERRAFORMING = 1,
  NAVIGATION = 2,
  ARTIFICIAL_INTELLIGENCE = 3,
  GAIAFORMING = 4,
  ECONOMY = 5,
  SCIENCE = 6,
}

export const RESEARCH_TRACK_NAMES: Record<ResearchTrack, string> = {
  [ResearchTrack.TERRAFORMING]: 'Terraforming',
  [ResearchTrack.NAVIGATION]: 'Navigation',
  [ResearchTrack.ARTIFICIAL_INTELLIGENCE]: 'Artificial Intelligence',
  [ResearchTrack.GAIAFORMING]: 'Gaia Forming',
  [ResearchTrack.ECONOMY]: 'Economy',
  [ResearchTrack.SCIENCE]: 'Science',
};

// ============================================================================
// EVENT TYPES
// ============================================================================

export enum EventType {
  // Race selection
  NOTIFY_CHOOSE_RACE = 'notifyChooseRace',

  // Game state
  GAME_STATE_CHANGE = 'gameStateChange',

  // Round tracking
  NOTIFY_ROUND_END = 'notifyRoundEnd',

  // Building actions
  NOTIFY_BUILD = 'notifyBuild', // Building mines (structure 4)
  NOTIFY_UPGRADE = 'notifyUpgrade', // Upgrading to other structures

  // Research track advances
  NOTIFY_RESEARCH = 'notifyResearch', // Advancing on a research track (+1 to track level)

  // Scoring
  NOTIFY_SCORE = 'notifyScore', // Final scoring events (used to detect active final scoring missions)

  // Technology tiles
  NOTIFY_GAIN_TECH = 'notifyGainTech', // Gaining a technology tile (coverupTechId != 0 means advanced tech)

  // QIC actions and resource gains
  NOTIFY_ACTION = 'notifyAction',
  NOTIFY_GAIN_RESOURCE = 'notifyGainResource',

  // Generic notifications (e.g. auction results)
  NOTIFY_GENERIC = 'notifyGeneric',
}

// ============================================================================
// FINAL SCORING MISSIONS
// ============================================================================

export enum FinalScoringType {
  STRUCTURES_IN_FEDERATIONS = 1,
  STRUCTURES = 2,
  PLANET_TYPES = 3,
  GAIA_PLANETS = 4,
  SECTORS = 5,
  SATELLITES = 6,
}

export const FINAL_SCORING_NAMES: Record<FinalScoringType, string> = {
  [FinalScoringType.STRUCTURES_IN_FEDERATIONS]: 'Structures in Federations',
  [FinalScoringType.STRUCTURES]: 'Structures',
  [FinalScoringType.PLANET_TYPES]: 'Planet types',
  [FinalScoringType.GAIA_PLANETS]: 'Gaia planets',
  [FinalScoringType.SECTORS]: 'Sectors',
  [FinalScoringType.SATELLITES]: 'Satellites',
};

// Maps the `desc` field from notifyScore events to FinalScoringType IDs
export const FINAL_SCORING_DESC_TO_ID: Record<string, number> = {
  'Most structures in federations': FinalScoringType.STRUCTURES_IN_FEDERATIONS,
  'Most structures': FinalScoringType.STRUCTURES,
  'Most planet types': FinalScoringType.PLANET_TYPES,
  'Most Gaia planets': FinalScoringType.GAIA_PLANETS,
  'Most map tiles': FinalScoringType.SECTORS,
  'Most satellites': FinalScoringType.SATELLITES,
};

export function getFinalScoringName(id: number): string {
  return FINAL_SCORING_NAMES[id as FinalScoringType] || `Unknown Scoring (${id})`;
}

// ============================================================================
// ACTION KEYWORDS
// ============================================================================

// Keywords to search for in log messages to identify actions
export const ACTION_KEYWORDS = {
  BUILD_MINE: ['builds', 'mine', 'Build mine'],
  UPGRADE_TRADING_STATION: ['upgrade', 'trading station', 'Trading Station'],
  UPGRADE_RESEARCH_LAB: ['upgrade', 'research lab', 'Research Lab'],
  UPGRADE_PLANETARY_INSTITUTE: ['upgrade', 'planetary institute', 'Planetary Institute'],
  BUILD_ACADEMY: ['builds', 'academy', 'Academy'],
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PlayerRaceMapping {
  playerId: number;
  playerName: string;
  raceId: number;
  finalScore: number;
  startingScore: number;   // VP at game start (from notifyChooseRace)
  playerElo: number | null; // Normalized ELO (with BGA offset subtracted)
  buildings: number[][]; // buildings[round] = [buildingId1, buildingId2, ...]
  research: number[][];    // research[roundIdx][trackIdx] = absolute level at end of that round (0-indexed)
  researchLevels: number[]; // [t1..t6] — current absolute levels during parsing, tracks 1-6 at indices 0-5
  advancedTechs: number[]; // sorted array of advanced tech tile IDs (10-24) taken by this player
  standardTechs: number[]; // sorted array of standard tech tile IDs (1-9) taken by this player
  qicPoints: number;       // VP from 2-QIC (planet diversity) and 3-QIC (rescore federation) actions
  techPoints: number;      // VP from technology tile gains and round-end tech scoring
  totalScoredPoints: number; // finalScore - startingScore
  factionCost: number;     // VP bid cost in auction/draft mode (0 if no auction)
  isWinner: boolean;       // True if this player shared first place (gamerank === "1")
}

// Short display names for research tracks (for UI chips and labels)
export const RESEARCH_TRACK_SHORT_NAMES: Record<number, string> = {
  1: 'Terraforming',
  2: 'Navigation',
  3: 'AI',
  4: 'Gaia Forming',
  5: 'Economy',
  6: 'Science',
};

// Advanced technology tile labels (IDs 10-24)
export const ADVANCED_TECH_LABELS: Record<number, string> = {
  10: '+1Q5c',
  11: '+3ore',
  12: '+3knowledge',
  13: '2vpMine',
  14: '1oreSector',
  15: '2vpSector',
  16: '2vpGaia',
  17: '5vpFederation',
  18: '4vpTradingStation',
  19: '+3vpFederation',
  20: '+3vpLaboratory',
  21: '+1vpPlanetType',
  22: '+2vpKnowledgeStep',
  23: '+3vpMine',
  24: '+3vpTradingStation',
};

// Filenames for advanced tech images in /public/advanced-techs/
export const ADVANCED_TECH_IMAGES: Record<number, string> = {
  10: '10_(+1Q5c).webp',
  11: '11_(+3ore).webp',
  12: '12_(+3knowledge).webp',
  13: '13_(2vpMine).webp',
  14: '14_(1oreSector).webp',
  15: '15_(2vpSector).webp',
  16: '16_(2vpGaia).webp',
  17: '17_(5vpFederation).webp',
  18: '18_(4vpTradingStation).webp',
  19: '19_(+3vpFederation).webp',
  20: '20_(+3vpLaboratory).webp',
  21: '21_(+1vpPlanetType).webp',
  22: '22_(+2vpKnowledgeStep).webp',
  23: '23_(+3vpMine).webp',
  24: '24_(+3vpTradingStation).webp',
};

// Standard technology tile labels (IDs 1-9)
export const STANDARD_TECH_LABELS: Record<number, string> = {
  1: '1o1q',
  2: 'KForPlanetTypes',
  3: '7VP',
  4: '+3vpGaiaPlanet',
  5: 'BigBuildings',
  6: '+1o1c',
  7: '+1k1c',
  8: '+4c',
  9: 'Charge4',
};

// Filenames for standard tech images in /public/standart-techs/
export const STANDARD_TECH_IMAGES: Record<number, string> = {
  1: '1_(1o1q).webp',
  2: '2_(KForPlanetTypes).webp',
  3: '3_(7VP).webp',
  4: '4_(+3vpGaiaPlanet).webp',
  5: '5_(BigBuildings).webp',
  6: '6_(+1o1c).webp',
  7: '7_(+1k1c).webp',
  8: '8_(+4c).webp',
  9: '9_(Charge4).webp',
};

export interface BuildingAction {
  playerId: number;
  playerName: string;
  buildingType: BuildingType;
  buildingName: string;
  round: number;
  packetId: number;
  timestamp: number;
}
