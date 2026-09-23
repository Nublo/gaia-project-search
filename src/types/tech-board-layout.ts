// Slot position/size as a percentage of the board image's rendered width/height.
export interface SlotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TechBoardLayout {
  standard: SlotRect[]; // 9 standard-tech slots
  advanced: SlotRect[]; // 6 advanced-tech slots, one per research track
}
