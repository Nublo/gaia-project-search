// Slot position/size as a percentage of the board image's rendered width/height.
// rotate (degrees, clockwise) turns the slot around its center — used by the
// round scoring board, whose wedge slots fan around the central planet.
export interface SlotRect {
  top: number;
  left: number;
  width: number;
  height: number;
  rotate?: number;
}

export interface TechBoardLayout {
  standard: SlotRect[]; // 9 standard-tech slots
  advanced: SlotRect[]; // 6 advanced-tech slots, one per research track
  lostFleetColonizeTile: SlotRect; // covers the 3 QIC actions, which Lost Fleet removes
}

export interface RoundBoardLayout {
  rounds: SlotRect[]; // 6 round scoring slots, round 1 (left) to round 6 (right)
  finalScorings: SlotRect[]; // 2 final scoring slots: the grey panels above and below the 6/12/18 strip
  // Lost Fleet's extension piece (roundBoardExt.webp) hung under the round board,
  // as percentages of the round board's width; overlap = how far it tucks up
  // under the board's bottom edge.
  lostFleetExtension: { left: number; width: number; overlap: number };
  // Advanced tech slot on the extension, as percentages of the extension image.
  lostFleetExtensionAdvancedTech: SlotRect;
}
