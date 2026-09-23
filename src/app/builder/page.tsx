import type { Metadata } from 'next';
import TechConstructor from '@/components/TechConstructor';

export const metadata: Metadata = {
  title: 'Tech Constructor',
};

const SLOT_COUNT = 6;

// Parses repeated "slotIdx:techId" params (e.g. ?std=0:3&std=2:7) into a
// fixed-length slot array, mirroring the compact style used by search-url.ts.
function parseSlots(raw: string | string[] | undefined): (number | null)[] {
  const slots: (number | null)[] = Array(SLOT_COUNT).fill(null);
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const value of values) {
    const [idxStr, techStr] = value.split(':');
    const idx = Number(idxStr);
    const techId = Number(techStr);
    if (Number.isInteger(idx) && idx >= 0 && idx < SLOT_COUNT && Number.isFinite(techId)) {
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
  const initialStandard = parseSlots(params.std);
  const initialAdvanced = parseSlots(params.adv);

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
