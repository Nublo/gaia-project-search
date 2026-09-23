import type { Metadata } from 'next';
import TechConstructor from '@/components/TechConstructor';
import boardLayout from '@/lib/tech-board-layout.json';
import type { TechBoardLayout } from '@/types/tech-board-layout';

const layout = boardLayout as TechBoardLayout;

export const metadata: Metadata = {
  title: 'Tech Constructor',
};

// Parses repeated "slotIdx:techId" params (e.g. ?std=0:3&std=2:7) into a
// fixed-length slot array, mirroring the compact style used by search-url.ts.
// slotCount comes from tech-board-layout.json so it can't drift out of sync
// with the number of slots actually rendered on the board.
function parseSlots(raw: string | string[] | undefined, slotCount: number): (number | null)[] {
  const slots: (number | null)[] = Array(slotCount).fill(null);
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const value of values) {
    const [idxStr, techStr] = value.split(':');
    const idx = Number(idxStr);
    const techId = Number(techStr);
    if (Number.isInteger(idx) && idx >= 0 && idx < slotCount && Number.isFinite(techId)) {
      slots[idx] = techId;
    }
  }
  return slots;
}

export default async function ConstructorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialStandard = parseSlots(params.std, layout.standard.length);
  const initialAdvanced = parseSlots(params.adv, layout.advanced.length);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="w-full max-w-4xl mx-auto px-6 pt-2 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Tech Constructor</h1>
          <p className="text-sm text-gray-500 mt-1">Drag technology tiles onto the board, then generate a link to share this layout.</p>
        </div>

        <TechConstructor initialStandard={initialStandard} initialAdvanced={initialAdvanced} />
      </div>
    </div>
  );
}
