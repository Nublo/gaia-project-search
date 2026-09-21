import Image from 'next/image';
import type { GameResult, PlayerResult, SearchRequest, StructureCondition, ResearchCondition, AdvancedTechCondition, StandardTechCondition } from '@/types/game';
import { RACE_NAMES, getFinalScoringName, FINAL_SCORING_IMAGES, RESEARCH_TRACK_SHORT_NAMES, ArtifactType, getArtifactName, ARTIFACT_IMAGES } from '@/lib/gaia-constants';

const RACE_BADGE_CLASS: Record<string, string> = {
  'Terrans':      'bg-blue-600 text-white',
  'Lantids':      'bg-blue-600 text-white',
  'Firacs':       'bg-gray-900 text-white',
  'Bescods':      'bg-gray-900 text-white',
  'Ivits':        'bg-red-600 text-white',
  'Hadsch Hallas':'bg-red-600 text-white',
  'Bal T\'aks':   'bg-orange-500 text-white',
  'Geodens':      'bg-orange-500 text-white',
  'Gleens':       'bg-yellow-400 text-gray-900',
  'Xenos':        'bg-yellow-400 text-gray-900',
  'Itars':        'bg-white text-gray-700 border border-gray-300',
  'Nevlas':       'bg-white text-gray-700 border border-gray-300',
  'Ambas':        'bg-amber-800 text-white',
  'Taklons':      'bg-amber-800 text-white',
  'Moweyds':      'bg-cyan-500 text-white',
  'Space Giants': 'bg-cyan-500 text-white',
  'Tinkeroids':   'bg-purple-600 text-white',
  'Darkanians':   'bg-purple-600 text-white',
};

const STRUCTURE_LABELS: Record<string, string> = {
  'mine': 'Mine',
  'trading-station': 'Trading Station',
  'research-lab': 'Research Lab',
  'knowledge-academy': 'Knowledge Academy',
  'qic-academy': 'QIC Academy',
  'planetary-institute': 'Planetary Institute',
};

function raceBadgeClass(raceName: string): string {
  return RACE_BADGE_CLASS[raceName] ?? 'bg-purple-100 text-purple-800';
}

const RACE_NAME_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(RACE_NAMES).map(([id, name]) => [name, Number(id)])
);

const STRUCTURE_TO_ID: Record<string, number> = {
  'mine': 4,
  'trading-station': 5,
  'research-lab': 6,
  'knowledge-academy': 7,
  'qic-academy': 8,
  'planetary-institute': 9,
};

// Returns a display label for each condition this player satisfies that involves a building.
// Race-only conditions are skipped — the race badge already communicates that.
function getMatchedConditionLabels(
  player: PlayerResult,
  conditions: StructureCondition[]
): string[] {
  const labels: string[] = [];

  for (const cond of conditions) {
    // Check race filter (if present)
    if (cond.race) {
      const raceId = RACE_NAME_TO_ID[cond.race];
      if (player.raceId !== raceId) continue;
    }

    // If condition has a building, verify the player built it within maxRound
    if (cond.structure) {
      const buildingId = STRUCTURE_TO_ID[cond.structure];
      const maxRound = cond.maxRound ?? 6;
      const rounds: number[][] = player.buildingsData?.buildings ?? [];

      let builtInRound: number | null = null;
      for (let i = 0; i < Math.min(maxRound, rounds.length); i++) {
        if (rounds[i].includes(buildingId)) {
          builtInRound = i + 1; // convert 0-indexed to round number
          break;
        }
      }
      if (builtInRound === null) continue;

      const label = STRUCTURE_LABELS[cond.structure] ?? cond.structure;
      labels.push(`${label} R${builtInRound}`);
    }
    // Race-only condition: player matches but we show nothing extra
  }

  return labels;
}

function getMatchedResearchLabels(
  player: PlayerResult,
  conditions: ResearchCondition[]
): string[] {
  const labels: string[] = [];
  for (const cond of conditions) {
    if (!cond.track || cond.minLevel == null) continue;
    if (cond.race) {
      const raceId = RACE_NAME_TO_ID[cond.race];
      if (player.raceId !== raceId) continue;
    }
    const maxRound = cond.maxRound ?? 6;
    const research: number[][] = player.researchData?.research ?? [];
    const trackIdx = cond.track - 1;
    let reachedInRound: number | null = null;
    for (let i = 0; i < Math.min(maxRound, research.length); i++) {
      if ((research[i]?.[trackIdx] ?? 0) >= cond.minLevel) {
        reachedInRound = i + 1;
        break;
      }
    }
    if (reachedInRound === null) continue;
    const trackName = RESEARCH_TRACK_SHORT_NAMES[cond.track] ?? `Track ${cond.track}`;
    labels.push(`${trackName} Level ${cond.minLevel}: R${reachedInRound}`);
  }
  return labels;
}

const SORT_LABEL: Record<string, string> = {
  qicPoints: 'QIC',
  techPoints: 'Tech',
  totalScoredPoints: 'Scored',
};

interface GameCardProps {
  game: GameResult;
  structureConditions?: StructureCondition[];
  researchConditions?: ResearchCondition[];
  highlightedFinalScorings?: number[];
  highlightedArtifacts?: number[];
  advancedTechConditions?: AdvancedTechCondition[];
  standardTechConditions?: StandardTechCondition[];
  sortBy?: SearchRequest['sortBy'];
}

export default function GameCard({ game, structureConditions = [], researchConditions = [], highlightedFinalScorings = [], highlightedArtifacts = [], sortBy }: GameCardProps) {
  const sortedPlayers = [...game.players].sort((a, b) =>
    sortBy ? b[sortBy] - a[sortBy] : b.finalScore - a.finalScore
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <a
            href={`https://boardgamearena.com/table?table=${game.tableId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-semibold text-blue-600 hover:text-blue-800"
          >
            Watch BGA replay
          </a>
        </div>
        {(game.finalScorings?.length > 0 || game.artifacts?.length > 0) && (
          <div className="flex items-center gap-4">
            {game.artifacts?.length > 0 && (
              <div className="flex gap-2">
                {game.artifacts.map((id) => {
                  const isHighlighted = highlightedArtifacts.includes(id);
                  return (
                    <div
                      key={id}
                      className={isHighlighted ? 'rounded ring-4 ring-blue-500 ring-offset-2' : 'rounded'}
                    >
                      <Image
                        src={`/artifacts/${ARTIFACT_IMAGES[id as ArtifactType]}`}
                        alt={getArtifactName(id)}
                        title={getArtifactName(id)}
                        width={56}
                        height={43}
                        className="rounded"
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {game.finalScorings?.length > 0 && (
              <div className="flex gap-4">
                {game.finalScorings.map((id) => {
                  const isHighlighted = highlightedFinalScorings.includes(id);
                  return (
                    <div
                      key={id}
                      className={isHighlighted ? 'rounded ring-4 ring-blue-500 ring-offset-2' : 'rounded'}
                    >
                      <Image
                        src={`/final-scorings/${FINAL_SCORING_IMAGES[id]}`}
                        alt={getFinalScoringName(id)}
                        title={getFinalScoringName(id)}
                        width={80}
                        height={56}
                        className="rounded"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {sortedPlayers.map((player) => {
          const structureLabels = getMatchedConditionLabels(player, structureConditions);
          const researchLabels = getMatchedResearchLabels(player, researchConditions);
          return (
            <div
              key={player.id}
              className="flex items-center justify-between p-2 rounded bg-gray-50"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://boardgamearena.com/player?id=${player.playerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                >
                  {player.playerName}
                </a>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${raceBadgeClass(player.raceName)}`}>
                  {player.raceName}
                </span>
                {structureLabels.map((label) => (
                  <span
                    key={label}
                    className="text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-800 border border-blue-200"
                  >
                    {label}
                  </span>
                ))}
                {researchLabels.map((label) => (
                  <span
                    key={label}
                    className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-800 border border-green-300"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                {sortBy && sortBy !== 'finalScore' && sortBy !== 'factionCost' && (
                  <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {SORT_LABEL[sortBy]}: {player[sortBy]}
                  </span>
                )}
                <span className="text-xs text-gray-500">Cost: {player.factionCost}vp</span>
                <span>
                  <span className="font-medium">{player.finalScore}</span> pts
                </span>
                {player.playerElo != null && (
                  <span className="text-xs text-gray-500">ELO: {player.playerElo}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
