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
  // Lost Fleet expansion factions
  TINKEROIDS = 15,
  DARKANIANS = 16,
  MOWEYDS = 17,
  SPACE_GIANTS = 18,
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
  [RaceId.TINKEROIDS]: 'Tinkeroids',
  [RaceId.DARKANIANS]: 'Darkanians',
  [RaceId.MOWEYDS]: 'Moweyds',
  [RaceId.SPACE_GIANTS]: 'Space Giants',
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

  // Full board state sync (used to read Lost Fleet spaceship state, e.g. artifacts)
  NOTIFY_UPDATE = 'notifyUpdate',

  // Power/resource discards — also used to claim a Lost Fleet Artifact token
  // (discard 6 Power), identified by the presence of args.artifactTokenId
  NOTIFY_DISCARD = 'notifyDiscard',
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
  // Lost Fleet expansion
  ASTEROIDS = 7,
  PI_ACADEMY_DISTANCE = 8,
  DEEP_SPACE_SECTORS = 9,
  PLANET_TYPES_LOST_FLEET = 10, // Same condition as PLANET_TYPES (3), different physical tile/art
}

export const FINAL_SCORING_NAMES: Record<FinalScoringType, string> = {
  [FinalScoringType.STRUCTURES_IN_FEDERATIONS]: 'Structures in Federations',
  [FinalScoringType.STRUCTURES]: 'Structures',
  [FinalScoringType.PLANET_TYPES]: 'Planet types',
  [FinalScoringType.GAIA_PLANETS]: 'Gaia planets',
  [FinalScoringType.SECTORS]: 'Sectors',
  [FinalScoringType.SATELLITES]: 'Satellites',
  [FinalScoringType.ASTEROIDS]: 'Most asteroids',
  [FinalScoringType.PI_ACADEMY_DISTANCE]: 'Longest distance: Planetary Institute to Academy',
  [FinalScoringType.DEEP_SPACE_SECTORS]: 'Most deep space tiles',
  [FinalScoringType.PLANET_TYPES_LOST_FLEET]: 'Most planet types',
};

// Filenames for final-scoring images in /public/final-scorings/ — not all a
// uniform extension (Lost Fleet tiles were supplied as .png, base game as .webp).
export const FINAL_SCORING_IMAGES: Record<number, string> = {
  [FinalScoringType.STRUCTURES_IN_FEDERATIONS]: '1.webp',
  [FinalScoringType.STRUCTURES]: '2.webp',
  [FinalScoringType.PLANET_TYPES]: '3.webp',
  [FinalScoringType.GAIA_PLANETS]: '4.webp',
  [FinalScoringType.SECTORS]: '5.webp',
  [FinalScoringType.SATELLITES]: '6.webp',
  [FinalScoringType.ASTEROIDS]: '7.png',
  [FinalScoringType.PI_ACADEMY_DISTANCE]: '8.png',
  [FinalScoringType.DEEP_SPACE_SECTORS]: '9.png',
  [FinalScoringType.PLANET_TYPES_LOST_FLEET]: '10.png',
};

// Maps the `desc` field from notifyScore events to FinalScoringType IDs.
// All base-game and Lost Fleet missions are confirmed from real logs.
// Note: PLANET_TYPES_LOST_FLEET (10) is the same underlying condition as
// PLANET_TYPES (3), just different art — confirmed via a real log that BGA
// sends the identical desc text for both, so the log alone can't distinguish
// which tile was drawn (SearchForm.tsx's FINAL_SCORING_SEARCH_ID handles this
// on the UI side by mapping tile 10's selection to search for ID 3).
export const FINAL_SCORING_DESC_TO_ID: Record<string, number> = {
  'Most structures in federations': FinalScoringType.STRUCTURES_IN_FEDERATIONS,
  'Most structures': FinalScoringType.STRUCTURES,
  'Most planet types': FinalScoringType.PLANET_TYPES,
  'Most Gaia planets': FinalScoringType.GAIA_PLANETS,
  'Most map tiles': FinalScoringType.SECTORS,
  'Most deep space tiles': FinalScoringType.DEEP_SPACE_SECTORS,
  'Most satellites': FinalScoringType.SATELLITES,
  'Longest distance: Planetary Institute to Academy': FinalScoringType.PI_ACADEMY_DISTANCE,
  'Most asteroids': FinalScoringType.ASTEROIDS,
};

export function getFinalScoringName(id: number): string {
  return FINAL_SCORING_NAMES[id as FinalScoringType] || `Unknown Scoring (${id})`;
}

// The parser can only ever store PLANET_TYPES (3) — BGA sends an identical
// notifyScore desc for both physical tiles, so the log alone can't tell them
// apart (see FINAL_SCORING_DESC_TO_ID above). Displaying a stored `3` for a
// Lost Fleet game should still show that game's actual tile art (10).
export function getFinalScoringDisplayId(id: number, isLostFleet: boolean): number {
  return isLostFleet && id === FinalScoringType.PLANET_TYPES ? FinalScoringType.PLANET_TYPES_LOST_FLEET : id;
}

// ============================================================================
// LOST FLEET ARTIFACTS
// ============================================================================

// 13 Artifact tokens, exclusive to the Lost Fleet expansion. A game can have
// at most 4 of them (1 per player). IDs match the raw `availArtifacts` values
// found on the Twilight spaceship in the game log 1:1 — no translation needed.
export enum ArtifactType {
  ASTEROID_MINE_VP = 1,
  PROTOPLANET_MINE_VP = 2,
  GAIA_FORMING_STEP_VP = 3,
  SCIENCE_STEP_VP = 4,
  RESEARCH_LEVEL_3_VP = 5,
  DEEP_SPACE_SECTOR_VP = 6,
  PLANET_TYPE_VP = 7,
  KNOWLEDGE_AND_QIC = 8,
  CREDIT_AND_ORE_SMALL = 9,
  CREDIT_AND_ORE_LARGE = 10,
  COPY_FEDERATION = 11,
  POWER_INCOME_AREA_3 = 12,
  ORE_AND_KNOWLEDGE = 13,
}

export const ARTIFACT_NAMES: Record<ArtifactType, string> = {
  [ArtifactType.ASTEROID_MINE_VP]: '+7 VP (counts as an Asteroid mine)',
  [ArtifactType.PROTOPLANET_MINE_VP]: '+7 VP (counts as a Protoplanet mine)',
  [ArtifactType.GAIA_FORMING_STEP_VP]: '+3 VP per Gaia Forming level',
  [ArtifactType.SCIENCE_STEP_VP]: '+3 VP per Science level',
  [ArtifactType.RESEARCH_LEVEL_3_VP]: '+3 VP per Research Area at level 3+',
  [ArtifactType.DEEP_SPACE_SECTOR_VP]: '+3 VP per Deep Space sector',
  [ArtifactType.PLANET_TYPE_VP]: '+3 VP + 1 VP per Planet type',
  [ArtifactType.KNOWLEDGE_AND_QIC]: '+3 Knowledge + 1 QIC',
  [ArtifactType.CREDIT_AND_ORE_SMALL]: '+3 Credits + 3 Ore',
  [ArtifactType.CREDIT_AND_ORE_LARGE]: '+5 Credits + 2 Ore',
  [ArtifactType.COPY_FEDERATION]: 'Copy a Federation token',
  [ArtifactType.POWER_INCOME_AREA_3]: '+2 Power income (Area III)',
  [ArtifactType.ORE_AND_KNOWLEDGE]: '+1 Ore + 1 Knowledge',
};

// Filenames for artifact images in /public/artifacts/ — token 13's file is
// missing the underscore other files have ("13(+1o1k).png"), kept as-is.
export const ARTIFACT_IMAGES: Record<ArtifactType, string> = {
  [ArtifactType.ASTEROID_MINE_VP]: '1_(7vpAsteroidMine).png',
  [ArtifactType.PROTOPLANET_MINE_VP]: '2_(7vpProtoPlanetMine).png',
  [ArtifactType.GAIA_FORMING_STEP_VP]: '3_(3vpGaiaStep).png',
  [ArtifactType.SCIENCE_STEP_VP]: '4_(3vpScienceStep).png',
  [ArtifactType.RESEARCH_LEVEL_3_VP]: '5_(3vpTechLevel3Step).png',
  [ArtifactType.DEEP_SPACE_SECTOR_VP]: '6_(3vpDeepSpaceSector).png',
  [ArtifactType.PLANET_TYPE_VP]: '7_(1vpPlanetType+3vp).png',
  [ArtifactType.KNOWLEDGE_AND_QIC]: '8_(3k1q).png',
  [ArtifactType.CREDIT_AND_ORE_SMALL]: '9_(3c3o).png',
  [ArtifactType.CREDIT_AND_ORE_LARGE]: '10_(5c2o).png',
  [ArtifactType.COPY_FEDERATION]: '11_(copyFed).png',
  [ArtifactType.POWER_INCOME_AREA_3]: '12_(+2tokensBowl3).png',
  [ArtifactType.ORE_AND_KNOWLEDGE]: '13(+1o1k).png',
};

export function getArtifactName(id: number): string {
  return ARTIFACT_NAMES[id as ArtifactType] || `Unknown Artifact (${id})`;
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
  advancedTechs: number[]; // sorted array of advanced tech tile IDs (10-24 base, 30-35 Lost Fleet) taken by this player
  standardTechs: number[]; // sorted array of standard tech tile IDs (1-9 base, 40-42 Lost Fleet) taken by this player
  artifacts: number[];     // sorted array of Lost Fleet Artifact token IDs (1-13) claimed by this player
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

// Advanced technology tile labels (IDs 10-24 base game, 30-35 Lost Fleet)
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
  30: '6vpBigBuildingLF',
  31: '4vpDeepSpaceSectorLF',
  32: '+2vpDeepSpaceSectorLF',
  33: '+2vpAsteroidLF',
  34: '+2vpTerraformLF',
  35: '+4vpGreenActionLF',
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
  30: '30_(6vpBigBuildingLF).png',
  31: '31_(4vpDeepSpaceSectorLF).png',
  32: '32_(+2vpDeepSpaceSectorLF).png',
  33: '33_(+2vpAsteroidLF).png',
  34: '34_(+2vpTerraformLF).png',
  35: '35_(+4vpGreenActionLF).png',
};

// Lost-Fleet-art variant of advanced tech 21 (+1vpPlanetType). BGA logs this
// tile as techId 21 in Lost Fleet games too (verified: no LF game uses 36), so
// it has no numeric ID of its own. UI-only: in Lost Fleet mode the picker shows
// this image in place of 21's base art (see getAdvancedTechImage).
export const ADVANCED_TECH_LOST_FLEET_ART_VARIANT_IMAGE = '36_(+1vpPlanetTypeLF).png';

export function getAdvancedTechImage(id: number, lostFleetMode: boolean): string {
  return id === 21 && lostFleetMode ? ADVANCED_TECH_LOST_FLEET_ART_VARIANT_IMAGE : ADVANCED_TECH_IMAGES[id];
}

// Standard technology tile labels (IDs 1-9 base game, 40-42 Lost Fleet)
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
  40: 'mineTerra2LF',
  41: '+1navLF',
  42: '1o3kLF',
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
  40: '40_(mineTerra2LF).png',
  41: '41_(+1navLF).png',
  42: '42_(1o3kLF).png',
};

// KForPlanetsLF.png is a Lost-Fleet-art variant of standard tech 2
// (KForPlanetTypes) — same underlying tile/ID, no numeric ID of its own.
// UI-only: in Lost Fleet mode this image replaces id 2's base art (see
// getStandardTechImage) rather than showing as a separate selectable tile.
export const STANDARD_TECH_LOST_FLEET_ART_VARIANT_IMAGE = 'KForPlanetsLF.png';

export function getStandardTechImage(id: number, lostFleetMode: boolean): string {
  return id === 2 && lostFleetMode ? STANDARD_TECH_LOST_FLEET_ART_VARIANT_IMAGE : STANDARD_TECH_IMAGES[id];
}

export interface BuildingAction {
  playerId: number;
  playerName: string;
  buildingType: BuildingType;
  buildingName: string;
  round: number;
  packetId: number;
  timestamp: number;
}
