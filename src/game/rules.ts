import { FRUIT_CELL, clonePellets, countPellets } from "./maze.ts";
import { makeGhosts, makePlayer } from "./actors.ts";
import { cellOf } from "./board.ts";
import { opposite } from "./direction.ts";
import { burst, floatScore } from "./effects.ts";
import { resetHunt } from "./ghosts.ts";
import type { Game } from "./types.ts";

const READY_BEAT = 1.15;
const CLEAR_BEAT = 1.2;

export function placeRun(game: Game, level: number): void {
  game.player = makePlayer();
  game.ghosts = makeGhosts(level);
  resetHunt(game);
}

export function refillBoard(game: Game): void {
  game.pellets = clonePellets();
  game.remaining = countPellets(game.pellets);
  game.eaten = 0;
  game.fruitStage = 0;
  game.fruit = null;
}

export function rememberBest(game: Game): void {
  if (game.score > game.best) game.best = game.score;
}

export function grantLife(game: Game): void {
  while (game.score >= game.nextLife) {
    game.lives = Math.min(5, game.lives + 1);
    game.nextLife += 10000;
    game.events.push({ t: "life" });
    burst(game, game.player.x, game.player.y, 10, "amber");
  }
}

function takeDot(game: Game, tx: number, ty: number): void {
  game.pellets[ty][tx] = 0;
  game.remaining -= 1;
  game.eaten += 1;
  game.score += 10;
  game.events.push({ t: "dot" });
}

function frightenChasers(game: Game): void {
  game.chain = 0;
  game.frightLeft = Math.max(2, 6.4 - (game.level - 1) * 0.45);
  for (const ghost of game.ghosts) {
    if (ghost.state !== "out") continue;
    ghost.fright = game.frightLeft;
    if (ghost.dir) ghost.dir = opposite(ghost.dir);
    ghost.committed = false;
  }
}

function takePower(game: Game, tx: number, ty: number): void {
  game.pellets[ty][tx] = 0;
  game.remaining -= 1;
  game.eaten += 1;
  game.score += 50;
  frightenChasers(game);
  game.events.push({ t: "power" });
  burst(game, game.player.x, game.player.y, 12, "amber");
}

function spawnFruit(game: Game): void {
  const spot = { x: FRUIT_CELL.x + 0.5, y: FRUIT_CELL.y + 0.5, left: 9 };
  if (game.fruitStage === 0 && game.eaten >= 60) {
    game.fruit = { ...spot, value: 300 };
    game.fruitStage = 1;
    return;
  }
  if (game.fruitStage === 1 && game.eaten >= 150) {
    game.fruit = { ...spot, value: 800 };
    game.fruitStage = 2;
  }
}

function takeFruit(game: Game): void {
  const fruit = game.fruit;
  if (!fruit) return;
  if (Math.hypot(fruit.x - game.player.x, fruit.y - game.player.y) >= 0.55) return;
  game.score += fruit.value;
  game.events.push({ t: "fruit", pts: fruit.value });
  floatScore(game, fruit.x, fruit.y, String(fruit.value), 0.8);
  burst(game, fruit.x, fruit.y, 8, "amber");
  game.fruit = null;
}

export function eatTiles(game: Game): void {
  const cell = cellOf(game.player.x, game.player.y);
  if (!cell) return;
  const pellet = game.pellets[cell.ty][cell.tx];
  if (pellet === 1) takeDot(game, cell.tx, cell.ty);
  else if (pellet === 2) takePower(game, cell.tx, cell.ty);
  if (!game.fruit) spawnFruit(game);
  else takeFruit(game);
}

export function finishDeath(game: Game): void {
  game.lives -= 1;
  if (game.lives <= 0) {
    game.phase = "over";
    game.events.push({ t: "over" });
    rememberBest(game);
    return;
  }
  placeRun(game, game.level);
  game.phase = "ready";
  game.readyT = READY_BEAT;
  game.deathT = 0;
}

export function advanceLevel(game: Game): void {
  game.level += 1;
  refillBoard(game);
  placeRun(game, game.level);
  game.phase = "ready";
  game.readyT = CLEAR_BEAT;
  game.clearT = 0;
}

function eatGhost(game: Game, ghost: Game["ghosts"][number]): void {
  const points = 200 * 2 ** Math.min(3, game.chain);
  game.chain += 1;
  game.score += points;
  ghost.state = "eaten";
  ghost.fright = 0;
  ghost.committed = false;
  game.events.push({ t: "ghost", pts: points });
  floatScore(game, ghost.x, ghost.y, String(points), 0.7);
  game.shake = Math.max(game.shake, 0.4);
  burst(game, ghost.x, ghost.y, 10, "cream");
}

function killPlayer(game: Game): void {
  game.phase = "dying";
  game.deathT = 0;
  game.events.push({ t: "death" });
  game.shake = 0.75;
  burst(game, game.player.x, game.player.y, 14, "amber");
}

export function catchGhosts(game: Game): void {
  for (const ghost of game.ghosts) {
    if (ghost.state !== "out") continue;
    if (Math.hypot(ghost.x - game.player.x, ghost.y - game.player.y) > 0.62) continue;
    if (ghost.fright > 0) eatGhost(game, ghost);
    else {
      killPlayer(game);
      break;
    }
  }
}

export function awardClear(game: Game): void {
  game.score += 100 * game.level;
  game.phase = "levelclear";
  game.clearT = 0;
  game.events.push({ t: "level" });
  game.shake = Math.max(game.shake, 0.3);
}
