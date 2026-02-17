import type { GameResult } from '@/types/game';

interface GameCardProps {
  game: GameResult;
}

export default function GameCard({ game }: GameCardProps) {
  const sortedPlayers = [...game.players].sort((a, b) => b.finalScore - a.finalScore);

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
            Game #{game.tableId}
          </a>
          <div className="flex gap-4 text-sm text-gray-500 mt-1">
            <span>{game.playerCount} players</span>
            <span>Min ELO: {game.minPlayerElo ?? 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {sortedPlayers.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-2 rounded ${
              player.isWinner ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {player.isWinner && (
                <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full font-medium">
                  Winner
                </span>
              )}
              <span className="text-sm font-medium text-gray-900">{player.playerName}</span>
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                {player.raceName}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>
                <span className="font-medium">{player.finalScore}</span> pts
              </span>
              {player.playerElo != null && (
                <span className="text-xs text-gray-500">ELO: {player.playerElo}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
