import { COLS, ROWS, TILES, TUNNEL } from "./maze.ts";
import { DIR_VECTOR } from "./direction.ts";
import type { ActorKind, Dir, GhostState, Mover } from "./types.ts";
import type { Tile } from "./maze.ts";

export function canStand(kind: ActorKind, state: GhostState, tile: Tile): boolean {
  if (tile === "wall") return false;
  if (kind === "player") return tile === "floor";
  if (state === "out") return tile === "floor";
  return true;
}

export function canEnter(kind: ActorKind, state: GhostState, tx: number, ty: number): boolean {
  if (ty < 0 || ty >= ROWS) return false;
  let x = tx;
  if (TUNNEL[ty]) x = ((x % COLS) + COLS) % COLS;
  if (x < 0 || x >= COLS) return false;
  return canStand(kind, state, TILES[ty][x]);
}

export function cellOf(x: number, y: number): { tx: number; ty: number } | null {
  const ty = Math.floor(y);
  if (ty < 0 || ty >= ROWS) return null;
  let tx = Math.floor(x);
  if (TUNNEL[ty]) tx = ((tx % COLS) + COLS) % COLS;
  else if (tx < 0 || tx >= COLS) return null;
  return { tx, ty };
}

export function nearCenter(v: number): boolean {
  const fraction = ((v % 1) + 1) % 1;
  return Math.abs(fraction - 0.5) <= 0.2;
}

export function laneIsOpen(kind: ActorKind, state: GhostState, x: number, y: number, dir: Dir): boolean {
  const tx = Math.floor(x) + DIR_VECTOR[dir][0];
  const ty = Math.floor(y) + DIR_VECTOR[dir][1];
  return canEnter(kind, state, tx, ty);
}

export function canAdvance(kind: ActorKind, state: GhostState, x: number, y: number, dir: Dir): boolean {
  const [dx, dy] = DIR_VECTOR[dir];
  const cell = cellOf(x + dx * 0.501, y + dy * 0.501);
  if (!cell) return false;
  return canStand(kind, state, TILES[cell.ty][cell.tx]);
}

export function wrapTunnel(actor: Mover): void {
  const ty = Math.floor(actor.y);
  if (ty < 0 || ty >= ROWS || !TUNNEL[ty]) return;
  if (actor.x < 0) actor.x += COLS;
  else if (actor.x >= COLS) actor.x -= COLS;
}

export function tileAt(x: number, y: number): Tile | null {
  const cell = cellOf(x, y);
  if (!cell) return null;
  return TILES[cell.ty][cell.tx];
}
