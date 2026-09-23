'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  STANDARD_TECH_LABELS,
  STANDARD_TECH_IMAGES,
  ADVANCED_TECH_LABELS,
  ADVANCED_TECH_IMAGES,
} from '@/lib/gaia-constants';
import boardLayout from '@/lib/tech-board-layout.json';
import type { TechBoardLayout } from '@/types/tech-board-layout';

const layout = boardLayout as TechBoardLayout;

// Lost Fleet standard tiles (40-42) don't have a slot on the base-game board.
const STANDARD_TECH_IDS = Object.keys(STANDARD_TECH_LABELS).map(Number).filter((id) => id < 40).sort((a, b) => a - b);
const ADVANCED_TECH_IDS = Object.keys(ADVANCED_TECH_LABELS).map(Number).sort((a, b) => a - b);

type TechKind = 'standard' | 'advanced';

interface DragState {
  kind: TechKind;
  techId: number;
  fromSlot?: number; // set when dragging out of a board slot rather than the list
}

interface Props {
  initialStandard: (number | null)[];
  initialAdvanced: (number | null)[];
}

export default function TechConstructor({ initialStandard, initialAdvanced }: Props) {
  const [standard, setStandard] = useState<(number | null)[]>(initialStandard);
  const [advanced, setAdvanced] = useState<(number | null)[]>(initialAdvanced);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [copied, setCopied] = useState(false);

  const availableStandard = useMemo(() => {
    const placed = new Set(standard.filter((id): id is number => id != null));
    return STANDARD_TECH_IDS.filter((id) => !placed.has(id));
  }, [standard]);

  const availableAdvanced = useMemo(() => {
    const placed = new Set(advanced.filter((id): id is number => id != null));
    return ADVANCED_TECH_IDS.filter((id) => !placed.has(id));
  }, [advanced]);

  function startDrag(kind: TechKind, techId: number, fromSlot?: number) {
    return (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', String(techId));
      e.dataTransfer.effectAllowed = 'move';
      setDragging({ kind, techId, fromSlot });
    };
  }

  function dropOnSlot(kind: TechKind, slotIdx: number) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      if (!dragging || dragging.kind !== kind) return;
      const setSlots = kind === 'standard' ? setStandard : setAdvanced;
      setSlots((prev) => {
        const next = [...prev];
        if (dragging.fromSlot != null) next[dragging.fromSlot] = null;
        next[slotIdx] = dragging.techId;
        return next;
      });
      setDragging(null);
    };
  }

  function dropOnList(kind: TechKind) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      if (!dragging || dragging.kind !== kind || dragging.fromSlot == null) return;
      const setSlots = kind === 'standard' ? setStandard : setAdvanced;
      const fromSlot = dragging.fromSlot;
      setSlots((prev) => {
        const next = [...prev];
        next[fromSlot] = null;
        return next;
      });
      setDragging(null);
    };
  }

  function removeFromSlot(kind: TechKind, slotIdx: number) {
    const setSlots = kind === 'standard' ? setStandard : setAdvanced;
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  }

  function generateLink() {
    const params = new URLSearchParams();
    standard.forEach((id, i) => { if (id != null) params.append('std', `${i}:${id}`); });
    advanced.forEach((id, i) => { if (id != null) params.append('adv', `${i}:${id}`); });
    const qs = params.toString();
    const url = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', url);
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold text-gray-600 uppercase">Board</h4>
        <button
          type="button"
          onClick={generateLink}
          className="text-xs font-semibold px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {copied ? 'Link copied!' : 'Generate link'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Standard technologies list — left of the board */}
        <div
          className="w-full md:w-36 shrink-0 p-3 bg-gray-50 rounded border border-gray-200"
          onDragOver={(e) => e.preventDefault()}
          onDrop={dropOnList('standard')}
        >
          <h5 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Standard Technologies</h5>
          <div className="flex flex-row md:flex-col flex-wrap gap-2">
            {availableStandard.map((id) => (
              <div
                key={id}
                draggable
                onDragStart={startDrag('standard', id)}
                title={STANDARD_TECH_LABELS[id]}
                className="w-[75px] aspect-[150/116] relative cursor-grab rounded border border-gray-200 bg-white"
              >
                <Image src={`/standart-techs/${STANDARD_TECH_IMAGES[id]}`} alt={STANDARD_TECH_LABELS[id]} fill className="object-contain" />
              </div>
            ))}
            {availableStandard.length === 0 && <p className="text-xs text-gray-400">All placed on the board</p>}
          </div>
        </div>

        {/* Board — both slot rows overlaid at positions from tech-board-layout.json */}
        <div className="flex-1 min-w-0 relative w-full aspect-[1220/1311] rounded overflow-hidden bg-gray-900">
          <Image src="/board/gameBoard.webp" alt="Gaia Project research board" fill className="object-contain" />

          {layout.standard.map((rect, slotIdx) => {
            const techId = standard[slotIdx];
            return (
              <div
                key={`standard-${slotIdx}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={dropOnSlot('standard', slotIdx)}
                style={{ top: `${rect.top}%`, left: `${rect.left}%`, width: `${rect.width}%`, height: `${rect.height}%` }}
                className="absolute rounded border-2 border-dashed border-white/60"
              >
                {techId != null && (
                  <button
                    type="button"
                    draggable
                    onDragStart={startDrag('standard', techId, slotIdx)}
                    onClick={() => removeFromSlot('standard', slotIdx)}
                    title={`${STANDARD_TECH_LABELS[techId]} — click to remove`}
                    className="absolute inset-0 cursor-grab"
                  >
                    <Image
                      src={`/standart-techs/${STANDARD_TECH_IMAGES[techId]}`}
                      alt={STANDARD_TECH_LABELS[techId]}
                      fill
                      className="object-contain"
                    />
                  </button>
                )}
              </div>
            );
          })}

          {layout.advanced.map((rect, trackIdx) => {
            const techId = advanced[trackIdx];
            return (
              <div
                key={`advanced-${trackIdx}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={dropOnSlot('advanced', trackIdx)}
                style={{ top: `${rect.top}%`, left: `${rect.left}%`, width: `${rect.width}%`, height: `${rect.height}%` }}
                className="absolute rounded border-2 border-dashed border-gray-300"
              >
                {techId != null && (
                  <button
                    type="button"
                    draggable
                    onDragStart={startDrag('advanced', techId, trackIdx)}
                    onClick={() => removeFromSlot('advanced', trackIdx)}
                    title={`${ADVANCED_TECH_LABELS[techId]} — click to remove`}
                    className="absolute inset-0 cursor-grab"
                  >
                    <Image
                      src={`/advanced-techs/${ADVANCED_TECH_IMAGES[techId]}`}
                      alt={ADVANCED_TECH_LABELS[techId]}
                      fill
                      className="object-contain"
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Advanced technologies list — right of the board, 2 columns (there are a lot of these) */}
        <div
          className="w-full md:w-44 shrink-0 p-3 bg-gray-50 rounded border border-gray-200"
          onDragOver={(e) => e.preventDefault()}
          onDrop={dropOnList('advanced')}
        >
          <h5 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Advanced Technologies</h5>
          <div className="grid grid-cols-2 gap-2">
            {availableAdvanced.map((id) => (
              <div
                key={id}
                draggable
                onDragStart={startDrag('advanced', id)}
                title={ADVANCED_TECH_LABELS[id]}
                className="w-full aspect-[150/116] relative cursor-grab rounded border border-gray-200 bg-white"
              >
                <Image src={`/advanced-techs/${ADVANCED_TECH_IMAGES[id]}`} alt={ADVANCED_TECH_LABELS[id]} fill className="object-contain" />
              </div>
            ))}
            {availableAdvanced.length === 0 && <p className="text-xs text-gray-400 col-span-2">All placed on the board</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
