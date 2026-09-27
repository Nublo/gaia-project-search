// Tile groups placed on the /builder boards. Shared by the page (to parse link
// params into slot rows) and the client boards (to render and place tiles).
import {
  STANDARD_TECH_LABELS,
  ADVANCED_TECH_LABELS,
  ROUND_SCORING_LABELS,
  ROUND_SCORING_IMAGES,
  FINAL_SCORING_NAMES,
  FinalScoringType,
  getFinalScoringImage,
  isLostFleetFinalScoring,
  ARTIFACT_NAMES,
  ARTIFACT_IMAGES,
  type ArtifactType,
  FEDERATION_TOKEN_NAMES,
  FEDERATION_TOKEN_IMAGES,
  GLEENS_FEDERATION_TOKEN,
  isLostFleetFederationToken,
  getStandardTechImage,
  getAdvancedTechImage,
  isLostFleetStandardTech,
  isLostFleetAdvancedTech,
  isLostFleetRoundScoring,
} from '@/lib/gaia-constants';
import techLayout from '@/lib/tech-board-layout.json';
import roundLayout from '@/lib/round-board-layout.json';
import shipLayout from '@/lib/ship-layout.json';
import type { RoundBoardLayout, ShipLayout, TechBoardLayout } from '@/types/tech-board-layout';

export const TECH_LAYOUT = techLayout as TechBoardLayout;
export const ROUND_LAYOUT = roundLayout as RoundBoardLayout;
export const SHIPS = shipLayout.ships as ShipLayout[];

export const PLAYER_COUNTS = [2, 3, 4] as const;
export const DEFAULT_PLAYERS = 4;

// One kind of tile: its own list and its own row of slots, which may be spread
// over several board surfaces. Tiles of a group only go into that group's slots.
export interface TileGroup {
  key: string;
  param: string; // link param, one "slotIdx:tileId" value per placed tile
  title: string; // list heading
  ids: number[];
  labels: Record<number, string>;
  imageSrc: (id: number, lostFleet: boolean) => string;
  isLostFleet: (id: number) => boolean;
  slotCount: number;
  lostFleetOnlySlots: number[]; // slots that only exist in Lost Fleet mode
  // Slots that only exist at some player counts (default: all of them).
  slotExists?: (slotIdx: number, players: number) => boolean;
  tileAspect: string; // list tile aspect class, e.g. 'aspect-[150/116]'
}

export type SlotRows = Record<string, (number | null)[]>;

const sortedIds = (labels: Record<number, string>) => Object.keys(labels).map(Number).sort((a, b) => a - b);

// Advanced slots 0-5 sit on the tech board (one per research track); slot 6 is
// the Lost Fleet extension under the round board.
export const ADVANCED_EXTENSION_SLOT = TECH_LAYOUT.advanced.length;

export const STANDARD_GROUP: TileGroup = {
  key: 'standard',
  param: 'std',
  title: 'Standard Technologies',
  // Lost Fleet standard techs only go on ships (SHIP_TECH_GROUP), never here.
  ids: sortedIds(STANDARD_TECH_LABELS).filter((id) => !isLostFleetStandardTech(id)),
  labels: STANDARD_TECH_LABELS,
  imageSrc: (id, lostFleet) => `/standart-techs/${getStandardTechImage(id, lostFleet)}`,
  isLostFleet: isLostFleetStandardTech,
  slotCount: TECH_LAYOUT.standard.length,
  lostFleetOnlySlots: [],
  tileAspect: 'aspect-[150/116]',
};

export const ADVANCED_GROUP: TileGroup = {
  key: 'advanced',
  param: 'adv',
  title: 'Advanced Technologies',
  ids: sortedIds(ADVANCED_TECH_LABELS),
  labels: ADVANCED_TECH_LABELS,
  imageSrc: (id, lostFleet) => `/advanced-techs/${getAdvancedTechImage(id, lostFleet)}`,
  isLostFleet: isLostFleetAdvancedTech,
  slotCount: ADVANCED_EXTENSION_SLOT + 1,
  lostFleetOnlySlots: [ADVANCED_EXTENSION_SLOT],
  tileAspect: 'aspect-[150/116]',
};

export const ROUNDS_GROUP: TileGroup = {
  key: 'rounds',
  param: 'rnd',
  title: 'Round Scoring Tiles',
  ids: sortedIds(ROUND_SCORING_LABELS),
  labels: ROUND_SCORING_LABELS,
  imageSrc: (id) => `/round-bonus/tiles/${ROUND_SCORING_IMAGES[id]}`,
  isLostFleet: isLostFleetRoundScoring,
  slotCount: ROUND_LAYOUT.rounds.length,
  lostFleetOnlySlots: [],
  tileAspect: 'aspect-[182/211]',
};

// Two final scoring tiles per game, in BGA's endGameBonus order. Id 10 is only
// the Lost Fleet art of planet types (3) — BGA sends 3 in both modes — so it's
// not a separate tile here; getFinalScoringImage swaps the art instead.
export const FINAL_GROUP: TileGroup = {
  key: 'final',
  param: 'fin',
  title: 'Final Scoring Tiles',
  ids: sortedIds(FINAL_SCORING_NAMES).filter((id) => id !== FinalScoringType.PLANET_TYPES_LOST_FLEET),
  labels: FINAL_SCORING_NAMES,
  imageSrc: (id, lostFleet) => `/final-scorings/${getFinalScoringImage(id, lostFleet)}`,
  isLostFleet: isLostFleetFinalScoring,
  slotCount: 2,
  lostFleetOnlySlots: [],
  tileAspect: 'aspect-[199/128]',
};

// Lost Fleet standard techs, one per ship screen. Slot = ship type - 15
// (Eclipse, T.F. Mars, Rebellion); Rebellion isn't used in 2 player games.
export const SHIP_TECH_BASE_TYPE = 15;
export const REBELLION_SLOT = 2;

const federationTokenIds = sortedIds(FEDERATION_TOKEN_NAMES);
const federationImage = (id: number) => `/federationTokens/${FEDERATION_TOKEN_IMAGES[id]}`;

// The base game token on top of the Terraforming track (BGA bonusFedToken).
// The Gleens' token never goes there.
export const TERRA_FEDERATION_GROUP: TileGroup = {
  key: 'terraFed',
  param: 'fed',
  title: 'Federation Tokens',
  ids: federationTokenIds.filter((id) => !isLostFleetFederationToken(id) && id !== GLEENS_FEDERATION_TOKEN),
  labels: FEDERATION_TOKEN_NAMES,
  imageSrc: federationImage,
  isLostFleet: () => false,
  slotCount: 1,
  lostFleetOnlySlots: [],
  tileAspect: 'aspect-[96/119]',
};

// Lost Fleet tokens, one on each ship's shield. Slot = ship type - 15, so
// Eclipse 0, T.F. Mars 1, Rebellion 2, Twilight 3.
export const SHIP_FEDERATION_GROUP: TileGroup = {
  key: 'shipFed',
  param: 'shf',
  title: 'Lost Fleet Federation Tokens',
  ids: federationTokenIds.filter(isLostFleetFederationToken),
  labels: FEDERATION_TOKEN_NAMES,
  imageSrc: federationImage,
  isLostFleet: () => true,
  slotCount: 4,
  lostFleetOnlySlots: [],
  slotExists: (slotIdx, players) => slotIdx !== REBELLION_SLOT || players > 2,
  tileAspect: 'aspect-[96/119]',
};

export const SHIP_TECH_GROUP: TileGroup = {
  key: 'shipTech',
  param: 'shp',
  title: 'Lost Fleet Technologies',
  ids: sortedIds(STANDARD_TECH_LABELS).filter(isLostFleetStandardTech),
  labels: STANDARD_TECH_LABELS,
  imageSrc: (id, lostFleet) => `/standart-techs/${getStandardTechImage(id, lostFleet)}`,
  isLostFleet: () => true,
  slotCount: 3,
  lostFleetOnlySlots: [],
  slotExists: (slotIdx, players) => slotIdx !== REBELLION_SLOT || players > 2,
  tileAspect: 'aspect-[148/116]',
};

// Twilight holds one artifact per player, in BGA's availArtifacts order.
export const ARTIFACT_GROUP: TileGroup = {
  key: 'artifacts',
  param: 'art',
  title: 'Artifacts',
  ids: sortedIds(ARTIFACT_NAMES),
  labels: ARTIFACT_NAMES,
  imageSrc: (id) => `/artifacts/${ARTIFACT_IMAGES[id as ArtifactType]}`,
  isLostFleet: () => true,
  slotCount: 4,
  lostFleetOnlySlots: [],
  slotExists: (slotIdx, players) => slotIdx < players,
  tileAspect: 'aspect-[166/127]',
};

export const BUILDER_GROUPS: TileGroup[] = [
  STANDARD_GROUP,
  ADVANCED_GROUP,
  TERRA_FEDERATION_GROUP,
  ROUNDS_GROUP,
  FINAL_GROUP,
  SHIP_TECH_GROUP,
  SHIP_FEDERATION_GROUP,
  ARTIFACT_GROUP,
];

export function slotExists(g: TileGroup, slotIdx: number, players: number): boolean {
  return g.slotExists ? g.slotExists(slotIdx, players) : true;
}

export function parsePlayers(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (PLAYER_COUNTS as readonly number[]).includes(n) ? n : DEFAULT_PLAYERS;
}

// Parses repeated "slotIdx:tileId" params (e.g. ?std=0:3&std=2:7) into a
// fixed-length slot row, mirroring the compact style used by search-url.ts.
export function parseSlots(raw: string | string[] | undefined, slotCount: number): (number | null)[] {
  const slots: (number | null)[] = Array(slotCount).fill(null);
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const value of values) {
    const [idxStr, tileStr] = value.split(':');
    const idx = Number(idxStr);
    const tileId = Number(tileStr);
    if (Number.isInteger(idx) && idx >= 0 && idx < slotCount && Number.isFinite(tileId)) {
      slots[idx] = tileId;
    }
  }
  return slots;
}

// Serializes slot rows back into link params (the inverse of parseSlots).
export function slotsToParams(groups: TileGroup[], slots: SlotRows, params: URLSearchParams) {
  for (const g of groups) {
    slots[g.key].forEach((id, i) => { if (id != null) params.append(g.param, `${i}:${id}`); });
  }
}
