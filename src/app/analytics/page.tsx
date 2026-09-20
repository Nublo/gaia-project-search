import type { Metadata } from 'next';
import Image from 'next/image';
import { getAnalytics } from '@/lib/search';
import { SearchCriteriaSummary, RACE_IMAGE_FILES } from '@/components/SearchCriteriaSummary';
import type { SearchRequest } from '@/types/game';
import { deserializeSearchRequest, serializeSearchRequest } from '@/lib/search-url';

export const metadata: Metadata = {
  title: 'Player Analytics',
};

const EMPTY_REQUEST: SearchRequest = {
  playerNames: [],
  playerCounts: [],
  structureConditions: [],
  researchConditions: [],
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const searchRequest: SearchRequest = Object.keys(params).length > 0
    ? deserializeSearchRequest(params)
    : EMPTY_REQUEST;

  const selectedPlayerKey = typeof params.selectedPlayer === 'string' ? params.selectedPlayer : undefined;
  const selectedGroup = selectedPlayerKey !== undefined
    ? searchRequest.playerNames.find((g) => g.join(' + ') === selectedPlayerKey)
    : undefined;
  const effectiveSingleGroup = searchRequest.playerNames.length === 1
    ? searchRequest.playerNames[0]
    : selectedGroup;

  // performance.now() here is fine despite the purity lint: this is an async
  // Server Component that runs once per HTTP request on the server, not a
  // Client Component subject to React's re-render/memoization — the timing
  // is purely a debug footer ("Rendered in Xms"), not used in any decision.
  // eslint-disable-next-line react-hooks/purity
  const pageStart = performance.now();
  const { totalGames, factionStats, playerStats, queryMs } = await getAnalytics(searchRequest, selectedGroup);
  // eslint-disable-next-line react-hooks/purity
  const renderMs = Math.round(performance.now() - pageStart);

  const playerCounts = searchRequest.playerCounts ?? [];
  const show3rd = playerCounts.length === 0 || playerCounts.includes(3) || playerCounts.includes(4);
  const show4th = playerCounts.length === 0 || playerCounts.includes(4);
  const visiblePlaceIndices = [0, 1, ...(show3rd ? [2] : []), ...(show4th ? [3] : [])];

  const baseSearch = serializeSearchRequest(searchRequest);
  const multipleGroups = searchRequest.playerNames.length > 1;


  const placeWidths = [0, 1, 2, 3].map((i) =>
    Math.max(...factionStats.map((s) => String(s.places[i]).length), 1)
  );
  const totalWidth = Math.max(...factionStats.map((s) => String(s.gamesCount).length), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="w-full max-w-4xl mx-auto px-6 pt-2 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          {searchRequest.playerNames?.length === 1 && (
            <p className="text-lg text-gray-600 mt-1">Player: <strong>{searchRequest.playerNames[0].join(' + ')}</strong></p>
          )}
        </div>

        <div className="w-full max-w-4xl mx-auto px-6 pb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Active filters
            </h3>
            <SearchCriteriaSummary req={searchRequest} />
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-6 pb-4 space-y-1">
          <p className="text-gray-700">
            Total games: <strong>{totalGames}</strong>
          </p>
          {playerStats.map((ps) => (
            <div key={ps.playerName} className="space-y-0.5">
              <p className="text-gray-700 font-mono text-sm">
                <span className="font-sans font-semibold text-gray-800 mr-2">{ps.playerName}:</span>
                {visiblePlaceIndices.map((i, idx) => (
                  <span key={i}>
                    {['1st', '2nd', '3rd', '4th'][i]}: <strong>{ps.places[i]}</strong>
                    {idx < visiblePlaceIndices.length - 1 ? <span className="text-gray-400 mx-1">|</span> : null}
                  </span>
                ))}
                <span className="text-gray-400 mx-1">|</span>
                total: <strong>{ps.gamesCount}</strong>
              </p>
              {playerCounts.length === 0 && ps.placesByCount && [2, 3, 4].map((count) => {
                const cp = ps.placesByCount![count];
                if (!cp) return null;
                const countTotal = cp.reduce((a, b) => a + b, 0);
                if (countTotal === 0) return null;
                const indices = count === 2 ? [0, 1] : count === 3 ? [0, 1, 2] : [0, 1, 2, 3];
                return (
                  <p key={count} className="text-gray-500 font-mono text-xs pl-4">
                    {count}p:&nbsp;
                    {indices.map((i, idx) => (
                      <span key={i}>
                        {['1st', '2nd', '3rd', '4th'][i]}: <strong>{cp[i]}</strong>
                        {idx < indices.length - 1 ? <span className="text-gray-300 mx-1">|</span> : null}
                      </span>
                    ))}
                    <span className="text-gray-300 mx-1">|</span>
                    total: <strong>{countTotal}</strong>
                  </p>
                );
              })}
            </div>
          ))}
        </div>

        {multipleGroups && (
          <div className="w-full max-w-4xl mx-auto px-6 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Faction stats for:</span>
              {searchRequest.playerNames.map((group) => {
                const key = group.join(' + ');
                const isSelected = key === selectedPlayerKey;
                const href = `/analytics?${baseSearch}${isSelected ? '' : `&selectedPlayer=${encodeURIComponent(key)}`}`;
                return (
                  <a
                    key={key}
                    href={href}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {key}
                  </a>
                );
              })}
              {selectedPlayerKey && (
                <a href={`/analytics?${baseSearch}`} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
                  All players
                </a>
              )}
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-full">Faction</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Score</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">AVG fraction pts</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">AVG table ELO</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    {show4th ? '1st | 2nd | 3rd | 4th (total)' : show3rd ? '1st | 2nd | 3rd (total)' : '1st | 2nd (total)'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {factionStats.map((stat) => {
                  const rowRequest = {
                    ...searchRequest,
                    structureConditions: effectiveSingleGroup
                      ? (searchRequest.structureConditions ?? [])
                      : [...(searchRequest.structureConditions ?? []), { race: stat.raceName }],
                    playerRaceConditions: effectiveSingleGroup
                      ? [
                          ...(searchRequest.playerRaceConditions ?? []),
                          { playerNames: effectiveSingleGroup, race: stat.raceName },
                        ]
                      : (searchRequest.playerRaceConditions ?? []),
                  };
                  const rowHref = `/results?${serializeSearchRequest(rowRequest)}`;
                  return (
                  <tr key={stat.raceName} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <a href={rowHref} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                        {RACE_IMAGE_FILES[stat.raceName] && (
                          <Image
                            src={`/races/${RACE_IMAGE_FILES[stat.raceName]}`}
                            alt={stat.raceName}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                        )}
                        <span className="font-medium text-gray-900">{stat.raceName}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">
                      <a href={rowHref} target="_blank" rel="noreferrer" className="block">
                        {stat.score.toFixed(2)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      <a href={rowHref} target="_blank" rel="noreferrer" className="block">
                        {stat.avgPts.toFixed(1)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      <a href={rowHref} target="_blank" rel="noreferrer" className="block">
                        {stat.avgElo > 0 ? Math.round(stat.avgElo) : '—'}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600 whitespace-nowrap">
                      <a href={rowHref} target="_blank" rel="noreferrer" className="block">
                        {visiblePlaceIndices.map((i, idx) => (
                          <span key={i}><span className="inline-block text-right" style={{minWidth: `${placeWidths[i]}ch`}}>{stat.places[i]}</span>{idx < visiblePlaceIndices.length - 1 ? ' | ' : ''}</span>
                        ))} (<span className="inline-block text-right" style={{minWidth: `${totalWidth}ch`}}>{stat.gamesCount}</span>)
                      </a>
                    </td>
                  </tr>
                  );
                })}
                {factionStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No games found with these filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-600 space-y-2">
            <h3 className="font-semibold text-gray-700">How faction score is calculated</h3>
            <p>
              For each completed game with more than 1 player, a per-game score is computed as:
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded mx-1">f = N − place</span>
              where <span className="font-mono bg-gray-100 px-1 rounded">N</span> is the number of players and{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">place</span> is the player&apos;s finishing position (1 = highest score).
            </p>
            <p>
              Example: in a 4-player game, the scores for 1st / 2nd / 3rd / 4th place are{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">3 / 2 / 1 / 0</span>.
              If two players tie for 1st, both receive <span className="font-mono bg-gray-100 px-1 rounded">3</span>{' '}
              (best rank in the group), giving scores of <span className="font-mono bg-gray-100 px-1 rounded">3 / 3 / 1 / 0</span>.
            </p>
            <p>
              The faction score shown is the <strong>average</strong> of all per-game scores for that faction.
              Only games where the player played that specific faction are counted.
            </p>
            <p className="text-gray-500 italic">
              Only finished games with 2 or more players are included in analytics.
            </p>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-6 pt-1 pb-2">
          <p className="text-xs text-gray-400 text-center">
            Rendered in {renderMs}ms &middot; DB: {queryMs}ms
          </p>
        </div>
      </div>
    </div>
  );
}
