import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GameMapTimeline from '@/components/GameMapTimeline';
import { prisma } from '@/lib/db';
import { decodeMapTimeline, type StoredMapTimeline } from '@/lib/map-timeline';
import { getRaceName } from '@/lib/gaia-constants';

export const metadata: Metadata = {
  title: 'Game Map',
};

// A stored game's galaxy map, replayable step by step, from its game_replays row.
export default async function GamePage({ params }: { params: Promise<{ tableId: string }> }) {
  const tableId = Number((await params).tableId);
  if (!Number.isInteger(tableId)) notFound();
  const game = await prisma.game.findUnique({
    where: { tableId },
    select: { replay: { select: { mapTimeline: true } }, players: { select: { playerId: true, playerName: true, raceId: true} } },
  });
  if (!game) notFound();

  const timeline = game.replay ? decodeMapTimeline(game.replay.mapTimeline as unknown as StoredMapTimeline) : null;

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
