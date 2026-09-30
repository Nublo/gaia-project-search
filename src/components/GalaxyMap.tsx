'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import { PLANET_IMAGES, PLANET_NAMES } from '@/lib/gaia-constants';
import {
  HEX_H,
  HEX_W,
  BUILDING_SPRITES,
  STRUCTURES_SPRITE,
  SECTOR_H,
  SECTOR_W,
  availablePlanets,
  hasMapSizeChoice,
  hexKey,
  mapGeometry,
  nextBuilding,
  structureSpriteRow,
  type BuildingMap,
  type MapBuilding,
  type Box,
  type MapHex,
  type MapLayoutKey,
  type PlanetMap,
} from '@/lib/galaxy-map';

// Shapes and strokes from BGA's gaiaproject.css (.gpj-tile, .gpj-hex).
const SECTOR_CLIP =
  'polygon(6% 80%,0 70%,6% 60%,0 50%,6% 40%,0 30%,6% 20%,18% 20%,25% 10%,37% 10%,43% 0,57% 0,63% 10%,75% 10%,82% 20%,94% 20%,100% 30%,94% 40%,100% 50%,94% 60%,100% 70%,94% 80%,82% 80%,75% 90%,63% 90%,57% 100%,43% 100%,37% 90%,25% 90%,18% 80%,6% 80%)';
const SECTOR_OUTLINE =
  'M40 536 1 470l38-67-38-67 38-68-38-68 38-65h78l39-67h77l39-68h77l39 68h77l39 67h77l38 65-38 69 38 67-38 68 38 66-38 65h-77l-41 69h-76l-38 66h-79l-38-66h-76l-39-68H40';
const HEX_CLIP = 'polygon(0 50%,25.6% 0,74.4% 0,100% 50%,74.4% 100%,25.6% 100%)';
const HEX_OUTLINE = 'M0 67 40 0h76l40 67-40 67H40L0 67';
const PLANET_SIZE = 132;

const PICKER_WIDTH = 232;

// Percentage box inside the map, so the whole map scales with its container.
function boxStyle(b: Box, map: { width: number; height: number }): CSSProperties {
  return {
    left: `${(b.left / map.width) * 100}%`,
    top: `${(b.top / map.height) * 100}%`,
    width: `${(b.width / map.width) * 100}%`,
    height: `${(b.height / map.height) * 100}%`,
  };
}

// A building's piece of the structures sprite, centered on the hex at its map scale.
function buildingStyle(building: MapBuilding, row: number): CSSProperties {
  const { src, width, height, rowHeight } = STRUCTURES_SPRITE;
  const piece = BUILDING_SPRITES[building];
  const w = piece.width * piece.scale;
  const h = piece.height * piece.scale;
  return {
    width: `${(w / HEX_W) * 100}%`,
    height: `${(h / HEX_H) * 100}%`,
    left: `${((HEX_W - w) / 2 / HEX_W) * 100}%`,
    top: `${((HEX_H - h) / 2 / HEX_H) * 100}%`,
    backgroundImage: `url(${src})`,
    // Sprite scaled so the piece fills the box; percentage positions are
    // offset / (sprite size - box size).
    backgroundSize: `${(width / piece.width) * 100}% ${(height / piece.height) * 100}%`,
    backgroundPosition: `${(piece.x / (width - piece.width)) * 100}% ${((row * rowHeight) / (height - piece.height)) * 100}%`,
  };
}

const MAP_BUILDINGS = Object.keys(BUILDING_SPRITES).map(Number) as MapBuilding[];

interface Props {
  layoutKey: MapLayoutKey;
  planets: PlanetMap;
  onChange: (planets: PlanetMap) => void;
  buildings: BuildingMap;
  onBuildingsChange: (buildings: BuildingMap) => void;
  lostFleet: boolean;
  players: number;
  large: boolean;
  onLargeChange: (large: boolean) => void;
}

export default function GalaxyMap({
  layoutKey,
  planets,
  onChange,
  buildings,
  onBuildingsChange,
  lostFleet,
  players,
  large,
  onLargeChange,
}: Props) {
  const geometry = useMemo(() => mapGeometry(layoutKey), [layoutKey]);
  const choices = availablePlanets(lostFleet, players);
  const [picking, setPicking] = useState<MapHex | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close the picker on Escape or a click outside it (hex clicks reopen it).
  useEffect(() => {
    if (!picking) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicking(null); };
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node) && !(e.target as Element).closest?.('[data-hex]')) setPicking(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [picking]);

  // The layout changed under an open picker (players / Lost Fleet / size).
  const [prevKey, setPrevKey] = useState(layoutKey);
  if (prevKey !== layoutKey) {
    setPrevKey(layoutKey);
    setPicking(null);
  }

  function setPlanet(hex: MapHex, planet: number | null) {
    const key = hexKey(hex.q, hex.r);
    const next = { ...planets };
    if (planet == null) delete next[key];
    else next[key] = planet;
    onChange(next);
    if (buildings[key] != null) onBuildingsChange(withBuilding(buildings, key, undefined)); // a building goes with its planet
  }

  // Empty hex: open the planet picker. Planet of some faction's color: toggle
  // through a mine and a Planetary Institute of that color. Other planets (Gaia,
  // Transdim, Lost Planet, ships): nothing yet.
  function clickHex(hex: MapHex) {
    const key = hexKey(hex.q, hex.r);
    const planet = planets[key];
    if (planet == null) {
      setPicking(picking?.q === hex.q && picking.r === hex.r ? null : hex);
      return;
    }
    setPicking(null);
    if (structureSpriteRow(planet) == null) return;
    onBuildingsChange(withBuilding(buildings, key, nextBuilding(buildings[key])));
  }

  // Picker below the hex, or above it near the bottom of the map; kept inside the map horizontally.
  let pickerStyle: CSSProperties = {};
  if (picking) {
    const centerX = ((picking.left + picking.width / 2) / geometry.width) * 100;
    const below = picking.top + picking.height / 2 < geometry.height * 0.6;
    pickerStyle = {
      width: PICKER_WIDTH,
      left: `clamp(0px, calc(${centerX}% - ${PICKER_WIDTH / 2}px), calc(100% - ${PICKER_WIDTH}px))`,
      ...(below
        ? { top: `${((picking.top + picking.height * 0.85) / geometry.height) * 100}%` }
        : { bottom: `${(1 - (picking.top + picking.height * 0.15) / geometry.height) * 100}%` }),
    };
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h4 className="text-xs font-semibold text-gray-600 uppercase">Galaxy map</h4>
        {hasMapSizeChoice(players, lostFleet) && (
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-sm">
            {[false, true].map((l) => (
              <button
                key={String(l)}
                type="button"
                onClick={() => onLargeChange(l)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  large === l ? 'bg-white shadow-sm font-semibold text-blue-600' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {l ? '10 sectors' : '8 sectors'}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Click an empty hex to place a planet; click a planet to cycle a mine, a Planetary Institute of its color, or
        nothing; right-click a planet to remove it.
      </p>

      <MapCanvas
        layoutKey={layoutKey}
        planets={planets}
        picking={picking}
        buildings={buildings}
        onHexClick={clickHex}
        onHexRightClick={(h) => {
          setPicking(null);
          if (planets[hexKey(h.q, h.r)] != null) setPlanet(h, null);
        }}
        className="max-w-[900px]"
      >
        {picking && (
          <div
            ref={pickerRef}
            className="absolute z-20 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
            style={pickerStyle}
          >
            <div className="grid grid-cols-5 gap-1">
              {choices.map((id) => (
                <button
                  key={id}
                  type="button"
                  title={PLANET_NAMES[id]}
                  onClick={() => {
                    setPlanet(picking, id);
                    setPicking(null);
                  }}
                  className="relative aspect-square rounded hover:bg-blue-50"
                >
                  <Image src={`/map/planets/${PLANET_IMAGES[id]}`} alt={PLANET_NAMES[id]} fill sizes="44px" className="object-contain p-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </MapCanvas>
    </div>
  );
}

function withBuilding(buildings: BuildingMap, key: string, building: MapBuilding | undefined): BuildingMap {
  const next = { ...buildings };
  if (building == null) delete next[key];
  else next[key] = building;
  return next;
}

function hexTitle(planet: number | undefined, building: MapBuilding | undefined): string {
  if (planet == null) return 'Place a planet';
  const name = PLANET_NAMES[planet];
  if (structureSpriteRow(planet) == null) return `${name} — right-click to remove`;
  const next = nextBuilding(building);
  const action = next == null ? 'remove the building' : `place a ${BUILDING_SPRITES[next].name}`;
  return `${name}${building != null ? ` with a ${BUILDING_SPRITES[building].name}` : ''} — click to ${action}, right-click to remove the planet`;
}

// The map drawing alone: sectors, Lost Fleet pieces, hex outlines and planets.
// With onHexClick the hexes become clickable (the /builder editor); without,
// it's the read-only /game-setup view. children render on top (the picker).
export function MapCanvas({
  layoutKey,
  planets,
  buildings = {},
  picking = null,
  onHexClick,
  onHexRightClick,
  className = '',
  children,
}: {
  layoutKey: MapLayoutKey;
  planets: PlanetMap;
  buildings?: BuildingMap; // mine / PI per hex, in the planet's color
  picking?: MapHex | null;
  onHexClick?: (hex: MapHex) => void;
  onHexRightClick?: (hex: MapHex) => void;
  className?: string; // width classes
  children?: ReactNode;
}) {
  const geometry = useMemo(() => mapGeometry(layoutKey), [layoutKey]);
  return (
    <div className={`relative mx-auto rounded bg-[#010203] ${className}`}>
      <div className="relative w-full" style={{ aspectRatio: `${geometry.width} / ${geometry.height}` }}>
        {geometry.sectors.map((s, i) => (
          <div key={`s${i}`} className="absolute pointer-events-none" style={boxStyle(s, geometry)}>
            <div className="absolute inset-0" style={{ clipPath: SECTOR_CLIP }}>
              <Image src="/map/blankHex.webp" alt="" fill sizes="300px" className="object-fill" />
            </div>
            <svg viewBox={`0 0 ${SECTOR_W} ${SECTOR_H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              <path d={SECTOR_OUTLINE} stroke="#4a68a6" strokeWidth={6} fill="none" />
            </svg>
          </div>
        ))}
        {geometry.pieces.map((p, i) => (
          // A single hex cut from the middle of the sector art.
          <div
            key={`p${i}`}
            className="absolute pointer-events-none overflow-hidden"
            style={{ ...boxStyle(p, geometry), clipPath: HEX_CLIP }}
          >
            <div
              className="absolute"
              style={{
                width: `${(SECTOR_W / HEX_W) * 100}%`,
                height: `${(SECTOR_H / HEX_H) * 100}%`,
                left: `${(-(SECTOR_W - HEX_W) / 2 / HEX_W) * 100}%`,
                top: `${(-(SECTOR_H - HEX_H) / 2 / HEX_H) * 100}%`,
              }}
            >
              <Image src="/map/blankHex.webp" alt="" fill sizes="300px" className="object-fill" />
            </div>
          </div>
        ))}
        {geometry.hexes.map((h) => {
          const planet = planets[hexKey(h.q, h.r)];
          const row = structureSpriteRow(planet); // sprite row if this planet can hold a building
          const building = row != null ? buildings[hexKey(h.q, h.r)] : undefined;
          const isPicking = picking?.q === h.q && picking?.r === h.r;
          return (
            <div key={hexKey(h.q, h.r)} className="absolute pointer-events-none" style={boxStyle(h, geometry)}>
              <svg viewBox={`0 0 ${HEX_W} ${HEX_H}`} className="absolute inset-0 w-full h-full overflow-visible">
                <path
                  d={HEX_OUTLINE}
                  stroke={isPicking ? '#ffaa00' : '#5a88b6'}
                  strokeWidth={isPicking ? 5.5 : 1.5}
                  fill={isPicking ? '#ff880050' : 'none'}
                />
              </svg>
              {planet != null && (
                <div
                  className="absolute"
                  style={{
                    width: `${(PLANET_SIZE / HEX_W) * 100}%`,
                    height: `${(PLANET_SIZE / HEX_H) * 100}%`,
                    left: `${((HEX_W - PLANET_SIZE) / 2 / HEX_W) * 100}%`,
                    top: `${((HEX_H - PLANET_SIZE) / 2 / HEX_H) * 100}%`,
                  }}
                >
                  <Image src={`/map/planets/${PLANET_IMAGES[planet]}`} alt={PLANET_NAMES[planet]} fill sizes="80px" className="object-contain" />
                </div>
              )}
              {row != null &&
                // Every building is always rendered where one can go, so placing,
                // switching and removing them crossfades.
                MAP_BUILDINGS.map((b) => (
                  <div
                    key={b}
                    className={`absolute transition-opacity duration-700 ease-out motion-reduce:transition-none ${building === b ? 'opacity-100' : 'opacity-0'}`}
                    role={building === b ? 'img' : undefined}
                    aria-label={building === b ? BUILDING_SPRITES[b].name : undefined}
                    aria-hidden={building !== b}
                    style={buildingStyle(b, row)}
                  />
                ))}
              {onHexClick && (
                // Hex-shaped hit area: bounding boxes of neighbouring hexes overlap.
                <button
                  type="button"
                  data-hex
                  title={hexTitle(planet, building)}
                  onClick={() => onHexClick(h)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onHexRightClick?.(h);
                  }}
                  className="absolute inset-0 pointer-events-auto cursor-pointer hover:bg-white/15"
                  style={{ clipPath: HEX_CLIP }}
                />
              )}
            </div>
          );
        })}
        {children}
      </div>
    </div>
  );
}
