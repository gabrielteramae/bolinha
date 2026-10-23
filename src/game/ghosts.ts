import { GATE, SCATTER } from "./maze.ts";
import { canEnter, cellOf, nearCenter, tileAt } from "./board.ts";
import { DIR_VECTOR, opposite, speedForLevel } from "./direction.ts";
import { moveMover } from "./motion.ts";
import type { Dir, Game, Ghost, Mode } from "./types.ts";

const MODE_SCRIPT: [Mode, number][] = [
  ["scatter", 7],
  ["chase", 20],
  ["scatter", 7],
  ["chase", 20],
  ["scatter", 5],
  ["chase", 1e9],
];

export function resetHunt(game: Game): void {
  game.mode = "scatter";
  game.modeIndex = 0;
  game.modeT = MODE_SCRIPT[0][1];
  game.frightLeft = 0;
  game.chain = 0;
  game.playTime = 0;
  game.fruit = null;
}

function chaseTarget(ghost: Ghost, game: Game, tx: number, ty: number, dx: number, dy: number): { x: number; y: number } {
  if (ghost.id === 0) return { x: tx, y: ty };
  if (ghost.id === 1) return { x: tx + dx * 4, y: ty + dy * 4 };
  if (ghost.id === 2) {
    const ahead = { x: tx + dx * 2, y: ty + dy * 2 };
    const lead = game.ghosts[0];
    const leadCell = cellOf(lead.x, lead.y) ?? { tx: lead.x, ty: lead.y };
    return { x: ahead.x * 2 - leadCell.tx, y: ahead.y * 2 - leadCell.ty };
  }
  const distance = Math.hypot(tx - ghost.x, ty - ghost.y);
  return distance > 6 ? { x: tx, y: ty } : SCATTER[3];
}

function targetFor(ghost: Ghost, game: Game): { x: number; y: number } {
  if (ghost.state === "eaten") return { x: GATE.x, y: GATE.y };
  if (ghost.state === "leaving") return { x: GATE.x, y: GATE.y - 1 };
  if (game.mode === "scatter") return SCATTER[ghost.id];
  const cell = cellOf(game.player.x, game.player.y) ?? { tx: 1, ty: 1 };
  const dir = game.player.dir ?? game.player.lastDir;
  const [dx, dy] = DIR_VECTOR[dir];
  return chaseTarget(ghost, game, cell.tx, cell.ty, dx, dy);
}

function openLanes(ghost: Ghost, tx: number, ty: number, allowReverse: boolean): Dir[] {
  const order: Dir[] = ["up", "left", "down", "right"];
  return order.filter((dir) => {
    if (!allowReverse && ghost.dir && dir === opposite(ghost.dir)) return false;
    return canEnter("ghost", ghost.state, tx + DIR_VECTOR[dir][0], ty + DIR_VECTOR[dir][1]);
  });
}

function closestLane(options: Dir[], tx: number, ty: number, target: { x: number; y: number }): Dir {
  const order: Dir[] = ["up", "left", "down", "right"];
  let best = options[0];
  let bestDistance = Infinity;
  for (const dir of order) {
    if (!options.includes(dir)) continue;
    const nextX = tx + DIR_VECTOR[dir][0];
    const nextY = ty + DIR_VECTOR[dir][1];
    const distance = (nextX - target.x) ** 2 + (nextY - target.y) ** 2;
    if (distance < bestDistance - 1e-6) {
      bestDistance = distance;
      best = dir;
    }
  }
  return best;
}

function chooseGhostDir(ghost: Ghost, game: Game): Dir {
  const tx = Math.floor(ghost.x);
  const ty = Math.floor(ghost.y);
  const allowReverse = ghost.state !== "out" || ghost.fright > 0;
  const options = openLanes(ghost, tx, ty, allowReverse);
  if (options.length === 0) {
    if (ghost.dir) {
      const back = opposite(ghost.dir);
      if (canEnter("ghost", ghost.state, tx + DIR_VECTOR[back][0], ty + DIR_VECTOR[back][1])) return back;
    }
    return ghost.dir ?? "up";
  }
  if (options.length === 1) return options[0];
  if (ghost.state === "out" && ghost.fright > 0) return options[(Math.random() * options.length) | 0];
  return closestLane(options, tx, ty, targetFor(ghost, game));
}

function steerGhost(ghost: Ghost, game: Game): void {
  if (!nearCenter(ghost.x) || !nearCenter(ghost.y)) {
    ghost.committed = false;
    return;
  }
  if (ghost.committed) return;
  const next = chooseGhostDir(ghost, game);
  if (next !== ghost.dir) {
    ghost.x = Math.floor(ghost.x) + 0.5;
    ghost.y = Math.floor(ghost.y) + 0.5;
  }
  ghost.dir = next;
  ghost.lastDir = next;
  ghost.committed = true;
}

function ghostSpeed(ghost: Ghost, game: Game): number {
  const cruise = speedForLevel(game.level) * (game.remaining < 36 && ghost.fright <= 0 ? 1.08 : 1);
  if (ghost.state === "eaten") return 9.2;
  if (ghost.state === "leaving") return 4.1;
  if (ghost.fright > 0) return 3.2 * speedForLevel(game.level);
  if (ghost.state === "out") return 5.02 * cruise;
  return 0;
}

function reverseChasers(game: Game): void {
  for (const ghost of game.ghosts) {
    if (ghost.state !== "out" || !ghost.dir) continue;
    ghost.dir = opposite(ghost.dir);
    ghost.committed = false;
  }
}

function clearFright(game: Game): void {
  game.frightLeft = 0;
  for (const ghost of game.ghosts) ghost.fright = 0;
  reverseChasers(game);
}

function drainFright(game: Game, dt: number): void {
  game.frightLeft -= dt;
  if (game.frightLeft <= 0) {
    clearFright(game);
    return;
  }
  for (const ghost of game.ghosts) {
    if (ghost.state === "out") ghost.fright = game.frightLeft;
  }
}

function advanceMode(game: Game, dt: number): void {
  game.modeT -= dt;
  if (game.modeT > 0) return;
  game.modeIndex = Math.min(MODE_SCRIPT.length - 1, game.modeIndex + 1);
  const next = MODE_SCRIPT[game.modeIndex];
  game.mode = next[0];
  game.modeT = next[1];
  reverseChasers(game);
}

export function tickFrightOrMode(game: Game, dt: number): void {
  if (game.frightLeft > 0) {
    drainFright(game, dt);
    return;
  }
  advanceMode(game, dt);
}

export function tickFruitTimer(game: Game, dt: number): void {
  if (!game.fruit) return;
  game.fruit.left -= dt;
  if (game.fruit.left <= 0) game.fruit = null;
}

function settleGhostTile(ghost: Ghost, game: Game): void {
  const kind = tileAt(ghost.x, ghost.y);
  if (ghost.state === "eaten" && kind === "pen") {
    ghost.state = "rest";
    ghost.rest = 0.45;
    ghost.fright = 0;
    ghost.committed = false;
    return;
  }
  if (ghost.state === "leaving" && kind === "floor") {
    ghost.state = "out";
    ghost.fright = game.frightLeft;
    ghost.committed = false;
  }
}

export function advanceGhost(ghost: Ghost, game: Game, dt: number): void {
  if (ghost.state === "pen" && game.playTime >= ghost.release) ghost.state = "leaving";
  if (ghost.state === "rest") {
    ghost.rest -= dt;
    if (ghost.rest <= 0) ghost.state = "leaving";
    return;
  }
  if (ghost.state === "pen") return;
  moveMover(ghost, ghostSpeed(ghost, game) * dt, "ghost", ghost.state, () => steerGhost(ghost, game));
  settleGhostTile(ghost, game);
}
