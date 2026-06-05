import { describe, it, expect } from 'vitest';
import { serializeSearchRequest, deserializeSearchRequest } from '../search-url';
import type { SearchRequest } from '@/types/game';

const EMPTY: SearchRequest = {
  playerNames: [],
  playerCounts: [],
  structureConditions: [],
  researchConditions: [],
};

function roundtrip(req: SearchRequest): SearchRequest {
  const qs = serializeSearchRequest(req);
  const params = Object.fromEntries(new URLSearchParams(qs));
  // URLSearchParams.fromEntries loses repeated keys — use getAll via a proper parse
  const full: Record<string, string | string[]> = {};
  new URLSearchParams(qs).forEach((value, key) => {
    if (key in full) {
      full[key] = Array.isArray(full[key])
        ? [...(full[key] as string[]), value]
        : [full[key] as string, value];
    } else {
      full[key] = value;
    }
  });
  return deserializeSearchRequest(full);
}

describe('serializeSearchRequest', () => {
  it('produces empty string for empty request', () => {
    expect(serializeSearchRequest(EMPTY)).toBe('');
  });

  it('serializes playerNames as separate groups', () => {
    const qs = serializeSearchRequest({ ...EMPTY, playerNames: [['Alice'], ['Bob']] });
    expect(qs).toBe('player=Alice&player=Bob');
  });

  it('serializes a merged player group with pipe separator', () => {
    const qs = serializeSearchRequest({ ...EMPTY, playerNames: [['Alice', 'Bob']] });
    expect(qs).toBe('player=Alice|Bob');
  });

  it('serializes playerCounts', () => {
    const qs = serializeSearchRequest({ ...EMPTY, playerCounts: [3, 4] });
    expect(qs).toBe('count=3&count=4');
  });

  it('serializes a full structureCondition', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      structureConditions: [{ race: 'Terrans', structure: 'Mine', maxRound: 3 }],
    });
    expect(qs).toBe('struct=Terrans:Mine:3');
  });

  it('trims trailing empty fields in structureCondition', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      structureConditions: [{ race: 'Terrans', structure: 'Mine' }],
    });
    expect(decodeURIComponent(qs)).toBe('struct=Terrans:Mine');
  });

  it('keeps middle empty fields in structureCondition', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      structureConditions: [{ maxRound: 2 }],
    });
    expect(decodeURIComponent(qs)).toBe('struct=::2');
  });

  it('serializes a full researchCondition', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      researchConditions: [{ race: 'Gleens', track: 1, minLevel: 2, maxRound: 1 }],
    });
    expect(decodeURIComponent(qs)).toBe('research=Gleens:1:2:1');
  });

  it('trims trailing empty fields in researchCondition', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      researchConditions: [{ track: 2, minLevel: 3 }],
    });
    expect(decodeURIComponent(qs)).toBe('research=:2:3');
  });

  it('serializes advancedTechConditions', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      advancedTechConditions: [{ race: 'Terrans', techId: 5 }, { techId: 3 }],
    });
    expect(decodeURIComponent(qs)).toBe('advtech=Terrans:5&advtech=:3');
  });

  it('serializes standardTechConditions', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      standardTechConditions: [{ techId: 7 }],
    });
    expect(decodeURIComponent(qs)).toBe('stdtech=:7');
  });

  it('serializes playerRaceConditions single player', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      playerRaceConditions: [{ playerNames: ['Alice'], race: 'Terrans' }],
    });
    expect(decodeURIComponent(qs)).toBe('playerrace=Alice:Terrans');
  });

  it('serializes playerRaceConditions group', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      playerRaceConditions: [{ playerNames: ['Alice', 'Bob'], race: 'Terrans' }],
    });
    expect(decodeURIComponent(qs)).toBe('playerrace=Alice|Bob:Terrans');
  });

  it('serializes scalar fields', () => {
    const qs = serializeSearchRequest({
      ...EMPTY,
      winnerRace: 'Nevlas',
      winnerPlayerName: 'Bob',
      minPlayerElo: 300,
      sortBy: 'finalScore',
    });
    expect(decodeURIComponent(qs)).toBe(
      'winnerRace=Nevlas&winnerPlayer=Bob&minElo=300&sortBy=finalScore'
    );
  });

  it('serializes finalScorings', () => {
    const qs = serializeSearchRequest({ ...EMPTY, finalScorings: [1, 3] });
    expect(qs).toBe('scoring=1&scoring=3');
  });
});

describe('deserializeSearchRequest', () => {
  it('returns empty arrays for empty params', () => {
    const result = deserializeSearchRequest({});
    expect(result.playerNames).toEqual([]);
    expect(result.playerCounts).toEqual([]);
    expect(result.structureConditions).toEqual([]);
    expect(result.researchConditions).toEqual([]);
  });

  it('parses structureCondition with all fields', () => {
    const result = deserializeSearchRequest({ struct: 'Terrans:Mine:3' });
    expect(result.structureConditions).toEqual([{ race: 'Terrans', structure: 'Mine', maxRound: 3 }]);
  });

  it('parses structureCondition with missing trailing fields', () => {
    const result = deserializeSearchRequest({ struct: 'Terrans:Mine' });
    expect(result.structureConditions).toEqual([{ race: 'Terrans', structure: 'Mine', maxRound: undefined }]);
  });

  it('parses structureCondition with empty race', () => {
    const result = deserializeSearchRequest({ struct: ':Mine:3' });
    expect(result.structureConditions[0].race).toBeUndefined();
    expect(result.structureConditions[0].structure).toBe('Mine');
    expect(result.structureConditions[0].maxRound).toBe(3);
  });

  it('parses researchCondition with all fields', () => {
    const result = deserializeSearchRequest({ research: 'Gleens:1:2:1' });
    expect(result.researchConditions).toEqual([{ race: 'Gleens', track: 1, minLevel: 2, maxRound: 1 }]);
  });

  it('parses advancedTechCondition with race', () => {
    const result = deserializeSearchRequest({ advtech: 'Terrans:5' });
    expect(result.advancedTechConditions).toEqual([{ race: 'Terrans', techId: 5 }]);
  });

  it('parses advancedTechCondition without race', () => {
    const result = deserializeSearchRequest({ advtech: ':3' });
    expect(result.advancedTechConditions).toEqual([{ race: undefined, techId: 3 }]);
  });

  it('parses playerRaceCondition single player', () => {
    const result = deserializeSearchRequest({ playerrace: 'Alice:Terrans' });
    expect(result.playerRaceConditions).toEqual([{ playerNames: ['Alice'], race: 'Terrans' }]);
  });

  it('parses playerRaceCondition group', () => {
    const result = deserializeSearchRequest({ playerrace: 'Alice|Bob:Terrans' });
    expect(result.playerRaceConditions).toEqual([{ playerNames: ['Alice', 'Bob'], race: 'Terrans' }]);
  });

  it('parses scalar fields', () => {
    const result = deserializeSearchRequest({
      winnerRace: 'Nevlas',
      winnerPlayer: 'Bob',
      minElo: '300',
      sortBy: 'finalScore',
    });
    expect(result.winnerRace).toBe('Nevlas');
    expect(result.winnerPlayerName).toBe('Bob');
    expect(result.minPlayerElo).toBe(300);
    expect(result.sortBy).toBe('finalScore');
  });

  it('handles repeated params as separate groups', () => {
    const result = deserializeSearchRequest({ player: ['Alice', 'Bob'], count: ['3', '4'] });
    expect(result.playerNames).toEqual([['Alice'], ['Bob']]);
    expect(result.playerCounts).toEqual([3, 4]);
  });

  it('parses pipe-separated group', () => {
    const result = deserializeSearchRequest({ player: 'Alice|Bob' });
    expect(result.playerNames).toEqual([['Alice', 'Bob']]);
  });
});

describe('roundtrip', () => {
  it('preserves an empty request', () => {
    expect(roundtrip(EMPTY)).toMatchObject(EMPTY);
  });

  it('preserves a complex request', () => {
    const req: SearchRequest = {
      playerNames: [['Alice']],
      playerCounts: [3, 4],
      structureConditions: [{ race: 'Terrans', structure: 'Mine', maxRound: 3 }],
      researchConditions: [{ race: 'Gleens', track: 1, minLevel: 2, maxRound: 1 }],
      finalScorings: [1, 3],
      advancedTechConditions: [{ race: 'Terrans', techId: 5 }, { techId: 3 }],
      standardTechConditions: [{ techId: 7 }],
      playerRaceConditions: [{ playerNames: ['Alice'], race: 'Terrans' }],
      winnerRace: 'Nevlas',
      winnerPlayerName: 'Bob',
      minPlayerElo: 300,
      sortBy: 'finalScore',
    };
    expect(roundtrip(req)).toMatchObject(req);
  });

  it('preserves conditions with optional fields absent', () => {
    const req: SearchRequest = {
      ...EMPTY,
      structureConditions: [{ structure: 'ResearchLab' }],
      researchConditions: [{ minLevel: 3 }],
    };
    const result = roundtrip(req);
    expect(result.structureConditions[0].structure).toBe('ResearchLab');
    expect(result.structureConditions[0].race).toBeUndefined();
    expect(result.researchConditions[0].minLevel).toBe(3);
    expect(result.researchConditions[0].race).toBeUndefined();
  });
});

describe('isAuction', () => {
  it('omits isAuction from the query when undefined', () => {
    expect(serializeSearchRequest(EMPTY)).not.toContain('isAuction');
  });

  it('serializes isAuction=true', () => {
    expect(serializeSearchRequest({ ...EMPTY, isAuction: true })).toBe('isAuction=true');
  });

  it('serializes isAuction=false', () => {
    expect(serializeSearchRequest({ ...EMPTY, isAuction: false })).toBe('isAuction=false');
  });

  it('deserializes isAuction=true to boolean true', () => {
    expect(deserializeSearchRequest({ isAuction: 'true' }).isAuction).toBe(true);
  });

  it('deserializes isAuction=false to boolean false', () => {
    expect(deserializeSearchRequest({ isAuction: 'false' }).isAuction).toBe(false);
  });

  it('leaves isAuction undefined when absent', () => {
    expect(deserializeSearchRequest({}).isAuction).toBeUndefined();
  });

  it('roundtrips both boolean values', () => {
    expect(roundtrip({ ...EMPTY, isAuction: true }).isAuction).toBe(true);
    expect(roundtrip({ ...EMPTY, isAuction: false }).isAuction).toBe(false);
  });
});
