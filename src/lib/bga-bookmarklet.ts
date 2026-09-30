/**
 * Bookmarklet that imports the tech board of a BGA Gaia Project game into
 * /builder. Runs on a BGA game or replay page, where BGA exposes the game state
 * as `gameui.gamedatas`; `board.techs` / `board.advTechs` list tile ids in the
 * same slot order as the builder's `std` / `adv` params (advanced slot 6 is the
 * Lost Fleet extension). `board.roundBonus` is 1-indexed by round — index 0 is
 * an unused 0 — so round r goes to builder `rnd` slot r - 1. `board.endGameBonus`
 * holds the 2 final scoring ids, which match ours (FinalScoringType 1-9).
 * Lost Fleet `board.lostFleet.ships[]`: a ship's `availTech` goes to builder
 * `shp` slot (type - 15); Twilight's `availArtifacts` (0 = empty socket) to
 * `art`, its `availFedTokenId` to `shf` (same slot numbering, Twilight = 3).
 * `board.bonusFedToken` (top of Terraforming) goes to `fed`. Player count
 * comes from `gamedatas.playerList`. Boosters go to `bst`: `board.availBoosters`
 * holds all players + 3 on a replay's initial state, but only the untaken ones
 * on a live game, so each player's held `boosterId` is added back.
 * `gamedatas.map` ({q: {r: hex}}) gives the planets as `pl` = "q,r:planetType";
 * its sector count (hexes with isTileCenter) tells base 3-4 player games' map
 * size, sent as `ms` (10 sectors = 'l').
 */

const NOT_A_GAME_MESSAGE =
  'Open a Gaia Project game or its replay on Board Game Arena, then click this bookmark again.';

// Plain ES5 so it runs in any browser without transpiling. Taken tiles can be
// missing (0/null) on a live game page — those slots are just skipped.
function bookmarkletBody(builderUrl: string): string {
  return `
var ui = window.gameui;
var board = ui && ui.gamedatas && ui.gamedatas.board;
if (!board || !Array.isArray(board.techs) || (ui.game_name && ui.game_name !== 'gaiaproject')) {
  alert(${JSON.stringify(NOT_A_GAME_MESSAGE)});
  return;
}
var params = new URLSearchParams();
var players = (ui.gamedatas.playerList || []).length;
if (players) params.set('p', String(players));
board.techs.forEach(function (id, i) { if (id) params.append('std', i + ':' + id); });
(board.advTechs || []).forEach(function (id, i) { if (id) params.append('adv', i + ':' + id); });
(board.roundBonus || []).forEach(function (id, i) { if (id && i > 0) params.append('rnd', (i - 1) + ':' + id); });
(board.endGameBonus || []).forEach(function (id, i) { if (id) params.append('fin', i + ':' + id); });
if (board.bonusFedToken) params.append('fed', '0:' + board.bonusFedToken);
((board.lostFleet && board.lostFleet.ships) || []).forEach(function (ship) {
  if (ship.availFedTokenId) params.append('shf', (ship.type - 15) + ':' + ship.availFedTokenId);
  if (ship.availTech) params.append('shp', (ship.type - 15) + ':' + ship.availTech);
  (ship.availArtifacts || []).forEach(function (id, i) { if (id) params.append('art', i + ':' + id); });
});
var boosters = (board.availBoosters || []).map(Number);
var gamePlayers = ui.gamedatas.players || {};
Object.keys(gamePlayers).forEach(function (pid) {
  var held = Number(gamePlayers[pid] && gamePlayers[pid].boosterId);
  if (held && boosters.indexOf(held) < 0) boosters.push(held);
});
boosters.filter(Boolean).forEach(function (id, i) { params.append('bst', i + ':' + id); });
var map = ui.gamedatas.map || {};
var sectors = 0;
Object.keys(map).forEach(function (q) {
  Object.keys(map[q]).forEach(function (r) {
    var hex = map[q][r];
    if (hex.isTileCenter && Number(hex.tileNum) < 100) sectors++;
    if (Number(hex.planetType)) params.append('pl', q + ',' + r + ':' + Number(hex.planetType));
  });
});
if (board.config && board.config.lostFleet) params.set('lf', '1');
else if (sectors && players > 2) params.set('ms', sectors >= 10 ? 'l' : 's');
window.open(${JSON.stringify(builderUrl)} + '?' + params.toString(), '_blank');
`;
}

/** `javascript:` URL to use as the bookmark's href. */
export function buildBookmarklet(builderUrl: string): string {
  const code = bookmarkletBody(builderUrl)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
  return `javascript:(function(){${encodeURIComponent(code)}})();`;
}
