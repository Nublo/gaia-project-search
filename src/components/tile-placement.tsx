'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import type { SlotRect } from '@/types/tech-board-layout';
import { slotExists, type SlotRows, type TileGroup } from '@/lib/builder-groups';

// Tile placement shared by every board on /builder: one hook owns all slot
// rows, selection, drag and flight state, so a tile picked from a list on one
// board can be placed on another (e.g. an advanced tech onto the Lost Fleet
// extension under the round board).

const FLY_MS = 500;

// A tile picked up by drag or by click. fromSlot is set when it is dragged from a
// board slot rather than the list.
interface TileRef {
  group: string;
  tileId: number;
  fromSlot?: number;
}

// Viewport box of an element before rotation, plus its rotation.
interface Geometry {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
}

// A clicked tile flying as a fixed-position ghost. 'place' flies from the list
// to toSlot and commits the placement on landing; 'return' flies from a slot
// back to the list — it's removed from the slot up front so its list spot
// renders (hidden) and `to` can be measured from it when the flight starts.
interface Flight extends TileRef {
  mode: 'place' | 'return';
  toSlot?: number;
  from: Geometry;
  to?: Geometry;
}

// Returns a copy of a slot row with the tile moved into slotIdx (vacating its old slot, if any).
function withTilePlaced(slots: (number | null)[], tile: TileRef, slotIdx: number): (number | null)[] {
  const next = [...slots];
  if (tile.fromSlot != null) next[tile.fromSlot] = null;
  next[slotIdx] = tile.tileId;
  return next;
}

// offsetWidth/Height ignore CSS transforms and a rotation keeps the center, so
// this recovers a rotated slot's unrotated box from its bounding rect.
function geometryOf(el: Element, rotate = 0): Geometry {
  const r = el.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = el as HTMLElement;
  return { left: r.left + r.width / 2 - width / 2, top: r.top + r.height / 2 - height / 2, width, height, rotate };
}

// List tiles are found by data attribute (group keys keep them unique on the page).
function findListTile(group: string, tileId: number) {
  return document.querySelector(`div[data-tile="${group}-${tileId}"]`);
}

function findSlot(group: string, slotIdx: number) {
  return document.querySelector<HTMLElement>(`div[data-slot="${group}-${slotIdx}"]`);
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useTilePlacement(groups: TileGroup[], initialSlots: SlotRows, lostFleet: boolean, players: number) {
  const [slots, setSlots] = useState<SlotRows>(initialSlots);
  const [dragging, setDragging] = useState<TileRef | null>(null);
  const [selected, setSelected] = useState<TileRef | null>(null);
  // Flights launched by one click (at most a place + the tile it displaces).
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightsStarted, setFlightsStarted] = useState(false);

  const groupByKey = useMemo(() => Object.fromEntries(groups.map((g) => [g.key, g])), [groups]);

  const available = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const g of groups) {
      const placed = new Set(slots[g.key].filter((id): id is number => id != null));
      out[g.key] = g.ids.filter((id) => !placed.has(id) && (lostFleet || !g.isLostFleet(id)));
    }
    return out;
  }, [groups, slots, lostFleet]);

  // Turning Lost Fleet off clears Lost-Fleet-only tiles and slots (adjusted
  // during render when the flag changes, rather than in an effect).
  const [prevLostFleet, setPrevLostFleet] = useState(lostFleet);
  if (prevLostFleet !== lostFleet) {
    setPrevLostFleet(lostFleet);
    if (!lostFleet) {
      setSelected(null);
      setSlots((prev) => Object.fromEntries(groups.map((g) => [
        g.key,
        prev[g.key].map((id, i) => (id != null && (g.isLostFleet(id) || g.lostFleetOnlySlots.includes(i)) ? null : id)),
      ])));
    }
  }

  // Fewer players removes slots (e.g. Rebellion, Twilight's extra artifact
  // sockets); their tiles go back to the lists.
  const [prevPlayers, setPrevPlayers] = useState(players);
  if (prevPlayers !== players) {
    setPrevPlayers(players);
    setSelected(null);
    setSlots((prev) => Object.fromEntries(groups.map((g) => [
      g.key,
      prev[g.key].map((id, i) => (slotExists(g, i, players) ? id : null)),
    ])));
  }

  // Once the ghosts are painted at their sources, measure return targets in the
  // lists and start the transition; land (commit placements) after FLY_MS.
  useEffect(() => {
    if (flights.length === 0) return;
    if (!flightsStarted) {
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          setFlights((fs) => fs.map((f) => {
            if (f.to) return f;
            const spot = findListTile(f.group, f.tileId);
            return { ...f, to: spot ? geometryOf(spot) : f.from };
          }));
          setFlightsStarted(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
    const timer = setTimeout(() => {
      setSlots((prev) => {
        const next = { ...prev };
        for (const f of flights) {
          if (f.mode === 'place' && f.toSlot != null) next[f.group] = withTilePlaced(next[f.group], f, f.toSlot);
        }
        return next;
      });
      setFlights([]);
      setFlightsStarted(false);
    }, FLY_MS);
    return () => clearTimeout(timer);
  }, [flights, flightsStarted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function placeTile(tile: TileRef, slotIdx: number) {
    setSlots((prev) => ({ ...prev, [tile.group]: withTilePlaced(prev[tile.group], tile, slotIdx) }));
  }

  // Flies a list tile into slotIdx; a tile already there flies back to the list.
  function flyToSlot(tile: TileRef, slotIdx: number, target: Element, rotate?: number) {
    const source = findListTile(tile.group, tile.tileId);
    if (!source || prefersReducedMotion()) {
      placeTile(tile, slotIdx);
      return;
    }
    const slotGeometry = geometryOf(target, rotate);
    const next: Flight[] = [{ ...tile, mode: 'place', toSlot: slotIdx, from: geometryOf(source), to: slotGeometry }];
    const displaced = slots[tile.group][slotIdx];
    if (displaced != null) {
      removeFromSlot(tile.group, slotIdx);
      next.push({ group: tile.group, tileId: displaced, mode: 'return', from: slotGeometry });
    }
    setFlights(next);
  }

  // First empty slot of an autoPlace group that's in play and rendered.
  function freeSlotFor(group: string): { index: number; el: HTMLElement } | null {
    const g = groupByKey[group];
    if (!g.autoPlace) return null;
    for (let i = 0; i < slots[group].length; i++) {
      if (slots[group][i] != null || !slotExists(g, i, players)) continue;
      if (!lostFleet && g.lostFleetOnlySlots.includes(i)) continue;
      const el = findSlot(group, i);
      if (el) return { index: i, el };
    }
    return null;
  }

  function removeFromSlot(group: string, slotIdx: number) {
    setSlots((prev) => {
      const next = [...prev[group]];
      next[slotIdx] = null;
      return { ...prev, [group]: next };
    });
  }

  return {
    lostFleet,
    players,
    slots,
    available,
    selected,
    flights,
    flightsStarted,

    group: (key: string) => groupByKey[key],
    imageSrc: (group: string, tileId: number) => groupByKey[group].imageSrc(tileId, lostFleet),
    isSelected: (group: string, tileId: number) => selected?.group === group && selected.tileId === tileId,
    isFlying: (group: string, tileId: number) => flights.some((f) => f.group === group && f.tileId === tileId),

    // ---- Click to move: click a list tile to select it, then click a slot ----

    // autoPlace groups skip selection while they have a free slot.
    toggleSelect(tile: TileRef) {
      if (flights.length > 0) return;
      const free = freeSlotFor(tile.group);
      if (free) {
        setSelected(null);
        flyToSlot(tile, free.index, free.el);
        return;
      }
      setSelected(selected?.group === tile.group && selected.tileId === tile.tileId ? null : tile);
    },

    // Places the selected list tile into slotIdx; a tile already there flies back to the list.
    moveSelectedTo(slotIdx: number, target: Element, rotate?: number) {
      if (!selected || flights.length > 0) return;
      setSelected(null);
      flyToSlot(selected, slotIdx, target, rotate);
    },

    // Sends a placed tile straight back to its list.
    returnToList(group: string, slotIdx: number, source: Element, rotate?: number) {
      const tileId = slots[group][slotIdx];
      if (tileId == null || flights.length > 0) return;
      removeFromSlot(group, slotIdx);
      if (!prefersReducedMotion()) {
        setFlights([{ group, tileId, mode: 'return', from: geometryOf(source, rotate) }]);
      }
    },

    // ---- Drag and drop ----

    startDrag(tile: TileRef) {
      return (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', String(tile.tileId));
        e.dataTransfer.effectAllowed = 'move';
        setSelected(null);
        setDragging(tile);
      };
    },

    dropOnSlot(group: string, slotIdx: number) {
      return (e: React.DragEvent) => {
        e.preventDefault();
        if (!dragging || dragging.group !== group) return;
        placeTile(dragging, slotIdx);
        setDragging(null);
      };
    },

    dropOnList(group: string) {
      return (e: React.DragEvent) => {
        e.preventDefault();
        if (!dragging || dragging.group !== group || dragging.fromSlot == null) return;
        removeFromSlot(group, dragging.fromSlot);
        setDragging(null);
      };
    },
  };
}

type TilePlacement = ReturnType<typeof useTilePlacement>;

const PlacementContext = createContext<TilePlacement | null>(null);

function usePlacement(): TilePlacement {
  const placement = useContext(PlacementContext);
  if (!placement) throw new Error('Tile placement components must be inside <TilePlacementProvider>');
  return placement;
}

export function TilePlacementProvider({ placement, children }: { placement: TilePlacement; children: ReactNode }) {
  return (
    <PlacementContext.Provider value={placement}>
      {children}
      <FlightLayer />
    </PlacementContext.Provider>
  );
}

const selectedRing = 'ring-2 ring-blue-500 ring-offset-1';

// A group's tiles not yet on a board — a 2 column sidebar by default; tall
// tiles (boosters) pass their own layout. `filter` splits a group over several
// lists (e.g. base and Lost Fleet boosters on either side of their slots).
export function TileList({
  groupKey,
  title,
  filter,
  className = 'w-full md:w-44',
  gridClassName = 'grid-cols-2',
}: {
  groupKey: string;
  title?: string; // defaults to the group's title
  filter?: (tileId: number) => boolean;
  className?: string; // width classes
  gridClassName?: string; // grid layout classes (full literal Tailwind classes)
}) {
  const p = usePlacement();
  const g = p.group(groupKey);
  const tiles = filter ? p.available[groupKey].filter(filter) : p.available[groupKey];
  return (
    <div
      className={`${className} shrink-0 p-3 bg-gray-50 rounded border border-gray-200`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={p.dropOnList(groupKey)}
    >
      <h5 className="text-xs font-semibold text-gray-600 mb-2 uppercase">{title ?? g.title}</h5>
      <div className={`grid ${gridClassName} gap-2`}>
        {tiles.map((id) => (
          <div
            key={id}
            data-tile={`${groupKey}-${id}`}
            draggable
            onDragStart={p.startDrag({ group: groupKey, tileId: id })}
            onClick={() => p.toggleSelect({ group: groupKey, tileId: id })}
            title={g.labels[id]}
            className={`w-full ${g.tileAspect} relative cursor-pointer rounded border border-gray-200 bg-white ${p.isSelected(groupKey, id) ? selectedRing : ''} ${p.isFlying(groupKey, id) ? 'invisible' : ''}`}
          >
            <Image src={p.imageSrc(groupKey, id)} alt={g.labels[id]} fill className="object-contain" />
          </div>
        ))}
        {tiles.length === 0 && <p className="text-xs text-gray-400 col-span-full">All placed on the board</p>}
      </div>
    </div>
  );
}

// A slot of some group, positioned on a board surface.
export interface SurfaceSlot {
  group: string;
  index: number;
  rect: SlotRect;
  idleBorder: string; // full literal Tailwind classes
}

function slotStyle(rect: SlotRect): React.CSSProperties {
  return {
    top: `${rect.top}%`,
    left: `${rect.left}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
    transform: rect.rotate ? `rotate(${rect.rotate}deg)` : undefined,
  };
}

// A board image with slots overlaid at percentage positions. Sized by its
// parent's width and the given aspect class. Without an image it's a bare
// frame for slots that have no board artwork (style it via className).
export function BoardSurface({
  image,
  alt,
  aspect,
  slots,
  overlay,
  className = '',
  style,
}: {
  image?: string;
  alt?: string;
  aspect: string; // e.g. 'aspect-[1220/1311]'
  slots: SurfaceSlot[];
  overlay?: ReactNode; // rendered on the image, beneath the slots
  className?: string;
  style?: React.CSSProperties;
}) {
  const p = usePlacement();
  return (
    <div className={`relative ${aspect} ${className}`} style={style}>
      {image && <Image src={image} alt={alt ?? ''} fill className="object-contain" />}
      {overlay}
      {slots.map(({ group, index, rect, idleBorder }) => {
        const tileId = p.slots[group][index];
        const isTarget = p.selected?.group === group;
        const label = tileId != null ? p.group(group).labels[tileId] : '';
        return (
          <div
            key={`${group}-${index}`}
            data-slot={`${group}-${index}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={p.dropOnSlot(group, index)}
            onClick={(e) => { if (isTarget) p.moveSelectedTo(index, e.currentTarget, rect.rotate); }}
            style={slotStyle(rect)}
            className={`absolute rounded border-2 ${isTarget ? 'border-solid border-blue-400 bg-blue-400/20 cursor-pointer' : `border-dashed ${idleBorder}`}`}
          >
            {tileId != null && (
              <button
                type="button"
                draggable
                onDragStart={p.startDrag({ group, tileId, fromSlot: index })}
                onClick={(e) => {
                  // With a list tile selected, this slot is a target (the current
                  // tile goes back to the list); otherwise a click removes it.
                  e.stopPropagation();
                  if (isTarget) p.moveSelectedTo(index, e.currentTarget, rect.rotate);
                  else p.returnToList(group, index, e.currentTarget, rect.rotate);
                }}
                title={`${label} — click to remove`}
                className="absolute inset-0 cursor-pointer"
              >
                <Image src={p.imageSrc(group, tileId)} alt={label} fill className="object-contain" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const flightTransition = ['left', 'top', 'width', 'height', 'transform'].map((prop) => `${prop} ${FLY_MS}ms ease-in-out`).join(', ');

function FlightLayer() {
  const p = usePlacement();
  return p.flights.map((flight) => {
    const g = p.flightsStarted && flight.to ? flight.to : flight.from;
    return (
      <div
        key={`${flight.group}-${flight.tileId}`}
        style={{
          left: g.left,
          top: g.top,
          width: g.width,
          height: g.height,
          transform: `rotate(${g.rotate}deg)`,
          transition: flightTransition,
        }}
        className="fixed z-50 pointer-events-none"
      >
        <Image src={p.imageSrc(flight.group, flight.tileId)} alt="" fill className="object-contain" />
      </div>
    );
  });
}
