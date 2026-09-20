import { describe, it, expect } from 'vitest'
import {
  getRaceName,
  getBuildingName,
  RACE_NAMES,
  BUILDING_NAMES,
  FINAL_SCORING_DESC_TO_ID,
  RESEARCH_TRACK_NAMES,
  RESEARCH_TRACK_SHORT_NAMES,
  ADVANCED_TECH_LABELS,
  STANDARD_TECH_LABELS,
  RaceId,
  BuildingType,
  ResearchTrack,
  FinalScoringType,
} from '../gaia-constants'

describe('getRaceName', () => {
  it('returns correct name for known race IDs', () => {
    expect(getRaceName(RaceId.TERRANS)).toBe('Terrans')
    expect(getRaceName(RaceId.GLEENS)).toBe('Gleens')
    expect(getRaceName(RaceId.BESCODS)).toBe('Bescods')
    expect(getRaceName(RaceId.ITARS)).toBe('Itars')
  })

  it('returns all 18 races (14 base game + 4 Lost Fleet)', () => {
    expect(Object.keys(RACE_NAMES)).toHaveLength(18)
  })

  it('returns correct names for the Lost Fleet expansion races', () => {
    expect(getRaceName(RaceId.TINKEROIDS)).toBe('Tinkeroids')
    expect(getRaceName(RaceId.DARKANIANS)).toBe('Darkanians')
    expect(getRaceName(RaceId.MOWEYDS)).toBe('Moweyds')
    expect(getRaceName(RaceId.SPACE_GIANTS)).toBe('Space Giants')
  })

  it('returns fallback string for unknown race ID', () => {
    const result = getRaceName(99)
    expect(result).toContain('99')
  })
})

describe('getBuildingName', () => {
  it('returns correct names for all building types', () => {
    expect(getBuildingName(BuildingType.MINE)).toBe('Mine')
    expect(getBuildingName(BuildingType.TRADING_STATION)).toBe('Trading Station')
    expect(getBuildingName(BuildingType.RESEARCH_LAB)).toBe('Research Lab')
    expect(getBuildingName(BuildingType.ACADEMY_LEFT)).toBe('Academy (Knowledge)')
    expect(getBuildingName(BuildingType.ACADEMY_RIGHT)).toBe('Academy (QIC)')
    expect(getBuildingName(BuildingType.PLANETARY_INSTITUTE)).toBe('Planetary Institute')
  })

  it('returns fallback for unknown building ID', () => {
    const result = getBuildingName(999)
    expect(result).toContain('999')
  })
})

describe('FINAL_SCORING_DESC_TO_ID', () => {
  it('maps all 6 base-game descriptions to correct IDs', () => {
    expect(FINAL_SCORING_DESC_TO_ID['Most structures in federations']).toBe(FinalScoringType.STRUCTURES_IN_FEDERATIONS)
    expect(FINAL_SCORING_DESC_TO_ID['Most structures']).toBe(FinalScoringType.STRUCTURES)
    expect(FINAL_SCORING_DESC_TO_ID['Most planet types']).toBe(FinalScoringType.PLANET_TYPES)
    expect(FINAL_SCORING_DESC_TO_ID['Most Gaia planets']).toBe(FinalScoringType.GAIA_PLANETS)
    expect(FINAL_SCORING_DESC_TO_ID['Most map tiles']).toBe(FinalScoringType.SECTORS)
    expect(FINAL_SCORING_DESC_TO_ID['Most satellites']).toBe(FinalScoringType.SATELLITES)
  })

  it('maps the confirmed Lost Fleet descriptions', () => {
    expect(FINAL_SCORING_DESC_TO_ID['Most deep space tiles']).toBe(FinalScoringType.DEEP_SPACE_SECTORS)
    expect(FINAL_SCORING_DESC_TO_ID['Longest distance: Planetary Institute to Academy']).toBe(FinalScoringType.PI_ACADEMY_DISTANCE)
    expect(FINAL_SCORING_DESC_TO_ID['Most asteroids']).toBe(FinalScoringType.ASTEROIDS)
  })

  it('has exactly 9 entries', () => {
    expect(Object.keys(FINAL_SCORING_DESC_TO_ID)).toHaveLength(9)
  })

  it('returns undefined for unknown description', () => {
    expect(FINAL_SCORING_DESC_TO_ID['Unknown description']).toBeUndefined()
  })
})

describe('RESEARCH_TRACK_NAMES', () => {
  it('has all 6 tracks', () => {
    expect(Object.keys(RESEARCH_TRACK_NAMES)).toHaveLength(6)
  })

  it('has correct names for each track', () => {
    expect(RESEARCH_TRACK_NAMES[ResearchTrack.TERRAFORMING]).toBe('Terraforming')
    expect(RESEARCH_TRACK_NAMES[ResearchTrack.NAVIGATION]).toBe('Navigation')
    expect(RESEARCH_TRACK_NAMES[ResearchTrack.ARTIFICIAL_INTELLIGENCE]).toBe('Artificial Intelligence')
    expect(RESEARCH_TRACK_NAMES[ResearchTrack.GAIAFORMING]).toBe('Gaia Forming')
    expect(RESEARCH_TRACK_NAMES[ResearchTrack.ECONOMY]).toBe('Economy')
    expect(RESEARCH_TRACK_NAMES[ResearchTrack.SCIENCE]).toBe('Science')
  })
})

describe('RESEARCH_TRACK_SHORT_NAMES', () => {
  it('covers all 6 tracks (1-indexed)', () => {
    for (let i = 1; i <= 6; i++) {
      expect(RESEARCH_TRACK_SHORT_NAMES[i]).toBeDefined()
    }
  })
})

describe('tech tile labels', () => {
  it('ADVANCED_TECH_LABELS covers IDs 10-24', () => {
    for (let id = 10; id <= 24; id++) {
      expect(ADVANCED_TECH_LABELS[id]).toBeDefined()
    }
  })

  it('STANDARD_TECH_LABELS covers IDs 1-9', () => {
    for (let id = 1; id <= 9; id++) {
      expect(STANDARD_TECH_LABELS[id]).toBeDefined()
    }
  })
})
