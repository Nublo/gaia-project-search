import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GameMapTimeline from '@/components/GameMapTimeline';
import { prisma } from '@/lib/db';
import { buildMapTimeline } from '@/lib/map-timeline';
import { getRaceName } from '@/lib/gaia-constants';

export const metadata: Metadata = {
  title: 'Game Map',
};

// A stored game's galaxy map, replayable step by step. The timeline is rebuilt
// from raw_game_log, which only the local database keeps.
export default async function GamePage({ params }: { params: Promise<{ tableId: string }> }) {
  const tableId = Number((await params).tableId);
  if (!Number.isInteger(tableId)) notFound();
  const game = await prisma.game.findUnique({
    where: { tableId },
    select: { rawGameLog: true, players: { select: { playerId: true, playerName: true, raceId: true} } },
  });
  if (!game) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs = (game.rawGameLog as any)?.rawLog?.data?.logs;
  const timeline = Array.isArray(logs) ? buildMapTimeline(logs) : null;

  const bgaLink = (
    <a
      href={`https://boardgamearena.com/table?table=${tableId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 text-sm font-semibold px-4 py-2 rounded border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors"
    >
      Open on BGA
    </a>
  );

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-4 sm:px-4">
      <div className="mx-auto max-w-[770px] space-y-3">
        {timeline ? (
          <GameMapTimeline timeline={timeline} players={game.players.map((p) => ({ ...p, raceName: getRaceName(p.raceId) }))} actions={bgaLink} />
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-900 p-4">
            <p className="text-slate-300">This game&apos;s log has no galaxy map to replay.</p>
            {bgaLink}
          </div>
        )}
      </div>
    </div>
  );
}
