import { clonePellets, countPellets } from "./maze.ts";
import { makeGhosts, makePlayer } from "./actors.ts";
import { opposite, speedForLevel } from "./direction.ts";
import { tickEffects } from "./effects.ts";
import { advanceGhost, tickFrightOrMode, tickFruitTimer } from "./ghosts.ts";
import { moveMover, steerPlayer } from "./motion.ts";
import { advanceLevel, awardClear, catchGhosts, eatTiles, finishDeath, grantLife, rememberBest } from "./rules.ts";
import type { Dir, Game } from "./types.ts";

export type {
  ActorKind,
  Dir,
  Floater,
  Fruit,
  Game,
  GameEvent,
  Ghost,
  GhostState,
  Mode,
  Mover,
  Particle,
  Phase,
} from "./types.ts";

export { opposite, speedForLevel as levelMul };

const PLAYER_SPEED = 6.05;
const READY_BEAT = 1.15;

export function createGame(best = 0, level = 1): Game {
  const pellets = clonePellets();
  return {
    phase: "title",
    level,
    score: 0,
    best,
    lives: 3,
    nextLife: 10000,
    pellets,
    remaining: countPellets(pellets),
    eaten: 0,
    player: makePlayer(),
    ghosts: makeGhosts(level),
    mode: "scatter",
    modeIndex: 0,
    modeT: 7,
    frightLeft: 0,
    chain: 0,
    playTime: 0,
    readyT: READY_BEAT,
    deathT: 0,
    clearT: 0,
    fruit: null,
    fruitStage: 0,
    shake: 0,
    particles: [],
    floats: [],
    events: [],
  };
}

export function begin(game: Game): void {
  const next = createGame(game.best, 1);
  next.phase = "ready";
  next.readyT = READY_BEAT;
  Object.assign(game, next);
}

export function togglePause(game: Game): void {
  if (game.phase === "playing") game.phase = "paused";
  else if (game.phase === "paused") game.phase = "playing";
}

export function setDirection(game: Game, dir: Dir): void {
  if (game.phase !== "playing" && game.phase !== "ready") return;
  game.player.nextDir = dir;
}

function isIdle(game: Game): boolean {
  return game.phase === "paused" || game.phase === "title" || game.phase === "over";
}

function tickReady(game: Game, dt: number): boolean {
  if (game.phase !== "ready") return false;
  game.readyT -= dt;
  if (game.readyT <= 0) {
    game.phase = "playing";
    game.events.push({ t: "go" });
  }
  return true;
}

function tickDying(game: Game, dt: number): boolean {
  if (game.phase !== "dying") return false;
  game.deathT += dt;
  if (game.deathT >= 0.85) finishDeath(game);
  return true;
}

function tickLevelClear(game: Game, dt: number): boolean {
  if (game.phase !== "levelclear") return false;
  game.clearT += dt;
  if (game.clearT >= 1.2) advanceLevel(game);
  return true;
}

function movePlayer(game: Game, dt: number): void {
  const distance = PLAYER_SPEED * speedForLevel(game.level) * dt;
  moveMover(game.player, distance, "player", "out", () => steerPlayer(game.player));
  if (game.player.dir) game.player.lastDir = game.player.dir;
}

export function step(game: Game, dt: number): void {
  if (isIdle(game)) return;
  tickEffects(game, dt);
  if (tickReady(game, dt)) return;
  if (tickDying(game, dt)) return;
  if (tickLevelClear(game, dt)) return;

  game.playTime += dt;
  tickFrightOrMode(game, dt);
  tickFruitTimer(game, dt);
  movePlayer(game, dt);
  eatTiles(game);
  for (const ghost of game.ghosts) advanceGhost(ghost, game, dt);
  catchGhosts(game);
  if (game.phase === "playing" && game.remaining <= 0) awardClear(game);
  grantLife(game);
  rememberBest(game);
}
