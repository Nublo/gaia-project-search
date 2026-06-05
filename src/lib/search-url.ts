import type { SearchRequest } from '@/types/game';

/**
 * Serializes a SearchRequest into human-readable URLSearchParams.
 *
 * Compound conditions use ':' as a field separator, e.g.:
 *   struct=Terrans:Mine:3    (race:structure:maxRound, empty = any)
 *   research=Gleens:Navigation:2:1  (race:track:minLevel:maxRound)
 *   advtech=Terrans:5 / stdtech=:5  (race:techId, empty race = any)
 *   playerrace=Alice:Terrans
 */
export function serializeSearchRequest(req: SearchRequest): string {
  const params = new URLSearchParams();

  req.playerNames.forEach((group) => params.append('player', group.join('|')));
  req.playerCounts.forEach((c) => params.append('count', String(c)));

  (req.structureConditions ?? []).forEach((c) => {
    const parts = [c.race ?? '', c.structure ?? '', c.maxRound != null ? String(c.maxRound) : ''];
    params.append('struct', trimTrailingEmpty(parts));
  });

  (req.researchConditions ?? []).forEach((c) => {
    const parts = [
      c.race ?? '',
      c.track != null ? String(c.track) : '',
      c.minLevel != null ? String(c.minLevel) : '',
      c.maxRound != null ? String(c.maxRound) : '',
    ];
    params.append('research', trimTrailingEmpty(parts));
  });

  (req.finalScorings ?? []).forEach((s) => params.append('scoring', String(s)));

  (req.advancedTechConditions ?? []).forEach((c) => {
    params.append('advtech', `${c.race ?? ''}:${c.techId}`);
  });

  (req.standardTechConditions ?? []).forEach((c) => {
    params.append('stdtech', `${c.race ?? ''}:${c.techId}`);
  });

  (req.playerRaceConditions ?? []).forEach((c) => {
    params.append('playerrace', `${c.playerNames.join('|')}:${c.race}`);
  });

  if (req.winnerRace) params.set('winnerRace', req.winnerRace);
  if (req.winnerPlayerName) params.set('winnerPlayer', req.winnerPlayerName);
  if (req.minPlayerElo != null) params.set('minElo', String(req.minPlayerElo));
  if (req.isAuction != null) params.set('isAuction', String(req.isAuction));
  if (req.sortBy) params.set('sortBy', req.sortBy);

  // URLSearchParams encodes ':' and '|' but both are safe in query values — keep them readable.
  return params.toString().replace(/%3A/gi, ':').replace(/%7C/gi, '|');
}

/** Trims trailing empty segments so "Terrans:Mine:" becomes "Terrans:Mine". */
function trimTrailingEmpty(parts: string[]): string {
  let end = parts.length;
  while (end > 1 && parts[end - 1] === '') end--;
  return parts.slice(0, end).join(':');
}

export function deserializeSearchRequest(raw: Record<string, string | string[] | undefined>): SearchRequest {
  const get = (key: string): string[] => {
    const v = raw[key];
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  };

  const str = (key: string) => {
    const v = raw[key];
    return typeof v === 'string' ? v : undefined;
  };

  const num = (key: string) => {
    const v = str(key);
    return v != null ? Number(v) : undefined;
  };

  return {
    playerNames: get('player').map((v) => v.split('|').filter(Boolean)),
    playerCounts: get('count').map(Number),

    structureConditions: get('struct').map((v) => {
      const [race, structure, maxRound] = v.split(':');
      return {
        race: race || undefined,
        structure: structure || undefined,
        maxRound: maxRound ? Number(maxRound) : undefined,
      };
    }),

    researchConditions: get('research').map((v) => {
      const [race, track, minLevel, maxRound] = v.split(':');
      return {
        race: race || undefined,
        track: track ? Number(track) : undefined,
        minLevel: minLevel ? Number(minLevel) : undefined,
        maxRound: maxRound ? Number(maxRound) : undefined,
      };
    }),

    finalScorings: get('scoring').map(Number),

    advancedTechConditions: get('advtech').map((v) => {
      const idx = v.indexOf(':');
      const race = idx > 0 ? v.slice(0, idx) : undefined;
      const techId = Number(v.slice(idx + 1));
      return { race, techId };
    }),

    standardTechConditions: get('stdtech').map((v) => {
      const idx = v.indexOf(':');
      const race = idx > 0 ? v.slice(0, idx) : undefined;
      const techId = Number(v.slice(idx + 1));
      return { race, techId };
    }),

    playerRaceConditions: get('playerrace').map((v) => {
      const idx = v.lastIndexOf(':');
      return {
        playerNames: v.slice(0, idx).split('|').filter(Boolean),
        race: v.slice(idx + 1),
      };
    }),

    winnerRace: str('winnerRace'),
    winnerPlayerName: str('winnerPlayer'),
    minPlayerElo: num('minElo'),
    isAuction: str('isAuction') === 'true' ? true : str('isAuction') === 'false' ? false : undefined,
    sortBy: str('sortBy') as SearchRequest['sortBy'],
  };
}
